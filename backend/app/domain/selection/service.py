from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.domain.providers.text import TextCompletionProvider, get_text_provider
from app.domain.selection.normalize import normalize_span
from app.domain.selection.schemas import (
    AddSelectionPendingRequest,
    AddSelectionPendingResponse,
    TranslateSelectionRequest,
    TranslateSelectionResponse,
)
from app.domain.spend_cap.service import SpendCapExceeded, check_spend_cap, record_usage
from app.models import SelectionLookupCache, User, VocabItem

SELECTION_TRANSLATE_COST = 0.002
SELECTION_PENDING_COST = 0.001


def _get_cache(db: Session, user_id: uuid.UUID, language: str, span: str) -> SelectionLookupCache | None:
    normalized = normalize_span(span).casefold()
    return (
        db.query(SelectionLookupCache)
        .filter(
            SelectionLookupCache.user_id == user_id,
            SelectionLookupCache.language == language,
            SelectionLookupCache.normalized_span == normalized,
        )
        .first()
    )


def _upsert_cache(
    db: Session,
    user_id: uuid.UUID,
    language: str,
    span: str,
    data: dict[str, str],
) -> None:
    normalized = normalize_span(span).casefold()
    row = _get_cache(db, user_id, language, span)
    if row:
        row.translation_pl = data["translation_pl"]
        row.example_l2 = data["example_l2"]
        row.example_pl = data["example_pl"]
    else:
        db.add(
            SelectionLookupCache(
                user_id=user_id,
                language=language,
                normalized_span=normalized,
                translation_pl=data["translation_pl"],
                example_l2=data["example_l2"],
                example_pl=data["example_pl"],
            )
        )
    db.commit()


def _call_translate_prompt(provider: TextCompletionProvider, req: TranslateSelectionRequest) -> dict[str, str]:
    messages = [
        {
            "role": "system",
            "content": (
                "Translate the English span to Polish for a learner. "
                'Return JSON: {"translation_pl":"","example_l2":"","example_pl":""}'
            ),
        },
        {
            "role": "user",
            "content": f"span: {req.span}\ncontext: {req.context_sentence or ''}",
        },
    ]
    result = provider.complete_json(messages)
    return {
        "translation_pl": result.get("translation_pl", ""),
        "example_l2": result.get("example_l2", req.span),
        "example_pl": result.get("example_pl", ""),
    }


def _call_pending_prompt(provider: TextCompletionProvider, span: str, language: str) -> dict[str, str]:
    messages = [
        {
            "role": "system",
            "content": (
                "Create flashcard fields for a language learner. "
                'Return JSON: {"translation_pl":"","context_sentence":""}'
            ),
        },
        {"role": "user", "content": f"term ({language}): {span}"},
    ]
    result = provider.complete_json(messages)
    return {
        "translation_pl": result.get("translation_pl", span),
        "context_sentence": result.get("context_sentence", ""),
    }


def translate_selection(
    db: Session,
    user: User,
    req: TranslateSelectionRequest,
    provider: TextCompletionProvider | None = None,
) -> TranslateSelectionResponse:
    check_spend_cap(db, user)
    provider = provider or get_text_provider()
    span = req.span
    cached = _get_cache(db, user.id, req.language, span)
    if cached:
        return TranslateSelectionResponse(
            span=span,
            translation_pl=cached.translation_pl,
            example_l2=cached.example_l2,
            example_pl=cached.example_pl,
            from_cache=True,
        )
    data = _call_translate_prompt(provider, req)
    _upsert_cache(db, user.id, req.language, span, data)
    record_usage(db, user.id, "gen_ai", SELECTION_TRANSLATE_COST, provider="selection_translate")
    return TranslateSelectionResponse(span=span, from_cache=False, **data)


def add_selection_pending(
    db: Session,
    user: User,
    req: AddSelectionPendingRequest,
    provider: TextCompletionProvider | None = None,
) -> AddSelectionPendingResponse:
    check_spend_cap(db, user)
    provider = provider or get_text_provider()
    term = req.span
    existing = (
        db.query(VocabItem)
        .filter(VocabItem.user_id == user.id, VocabItem.language == req.language, VocabItem.term == term)
        .first()
    )
    if existing:
        if existing.status in ("accepted", "pending"):
            return AddSelectionPendingResponse(
                status="already_exists", vocab_item_id=existing.id, term=existing.term
            )
        if existing.status == "rejected":
            translation = req.translation_pl
            context = req.context_sentence
            if not translation:
                card = _call_pending_prompt(provider, term, req.language)
                translation = card["translation_pl"]
                context = context or card["context_sentence"]
                record_usage(db, user.id, "gen_ai", SELECTION_PENDING_COST, provider="selection_pending_card")
            existing.status = "pending"
            existing.source = "transcript_selection"
            existing.translation = translation or existing.translation
            existing.context_sentence = context
            db.commit()
            return AddSelectionPendingResponse(status="reopened", vocab_item_id=existing.id, term=existing.term)

    translation = req.translation_pl
    context = req.context_sentence
    if not translation:
        card = _call_pending_prompt(provider, term, req.language)
        translation = card["translation_pl"]
        context = context or card["context_sentence"]
        record_usage(db, user.id, "gen_ai", SELECTION_PENDING_COST, provider="selection_pending_card")

    item = VocabItem(
        user_id=user.id,
        language=req.language,
        term=term,
        translation=translation or term,
        context_sentence=context,
        source="transcript_selection",
        status="pending",
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return AddSelectionPendingResponse(status="created", vocab_item_id=item.id, term=item.term)


__all__ = ["SpendCapExceeded", "translate_selection", "add_selection_pending"]
