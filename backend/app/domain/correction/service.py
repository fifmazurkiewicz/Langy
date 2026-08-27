from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.domain.correction.schemas import (
    AddCorrectionPendingRequest,
    AddCorrectionPendingResponse,
    CorrectionRequest,
    CorrectionResponse,
)
from app.domain.correction.substantive import is_substantive_diff
from app.domain.providers.text import TextCompletionProvider, get_text_provider
from app.domain.selection.normalize import normalize_span
from app.domain.spend_cap.service import SpendCapExceeded, check_spend_cap, record_usage
from app.models import User, VocabItem

CORRECTION_COST = 0.002


def _call_turn_correction(provider: TextCompletionProvider, req: CorrectionRequest) -> dict:
    messages = [
        {
            "role": "system",
            "content": (
                "Analyze learner utterance for substantive errors. L1 is Polish. "
                "Ignore punctuation/case-only differences. "
                'Return JSON: {"is_corrected":bool,"corrected_text":"","explanation_pl":"",'
                '"mistake_type":"Grammar"|"Word choice"|"Pronunciation"|null}'
            ),
        },
        {
            "role": "user",
            "content": (
                f"language: {req.language}\nmode: {req.mode}\ntext: {req.text}\n"
                f"context_before: {req.context_before or ''}\ncontext_after: {req.context_after or ''}"
            ),
        },
    ]
    return provider.complete_json(messages)


def run_correction(
    db: Session,
    user: User,
    req: CorrectionRequest,
    provider: TextCompletionProvider | None = None,
) -> CorrectionResponse:
    check_spend_cap(db, user)
    provider = provider or get_text_provider()
    data = _call_turn_correction(provider, req)
    record_usage(db, user.id, "gen_ai", CORRECTION_COST, provider="turn_correction")

    corrected = data.get("corrected_text") or None
    is_corrected = bool(data.get("is_corrected"))
    if is_corrected and corrected and not is_substantive_diff(req.text, corrected):
        is_corrected = False
        corrected = None

    mistake = data.get("mistake_type")
    if mistake not in ("Grammar", "Word choice", "Pronunciation"):
        mistake = None

    return CorrectionResponse(
        is_corrected=is_corrected,
        corrected_text=corrected if is_corrected else None,
        explanation_pl=data.get("explanation_pl") if is_corrected else None,
        mistake_type=mistake if is_corrected else None,
        original_text=req.text,
    )


def add_correction_pending(
    db: Session,
    user: User,
    req: AddCorrectionPendingRequest,
    provider: TextCompletionProvider | None = None,
) -> AddCorrectionPendingResponse:
    check_spend_cap(db, user)
    provider = provider or get_text_provider()
    term = normalize_span(req.corrected_text)
    translation = req.explanation_pl
    if not translation:
        messages = [
            {
                "role": "system",
                "content": 'Return JSON: {"translation_pl":""} — short Polish gloss for the corrected term.',
            },
            {"role": "user", "content": f"term: {term}"},
        ]
        translation = provider.complete_json(messages).get("translation_pl", term)
        record_usage(db, user.id, "gen_ai", 0.001, provider="correction_pending_card")

    existing = (
        db.query(VocabItem)
        .filter(VocabItem.user_id == user.id, VocabItem.language == req.language, VocabItem.term == term)
        .first()
    )
    if existing:
        if existing.status in ("accepted", "pending"):
            return AddCorrectionPendingResponse(
                status="already_exists", vocab_item_id=existing.id, term=existing.term
            )
        if existing.status == "rejected":
            existing.status = "pending"
            existing.source = "correction"
            existing.translation = translation or existing.translation
            existing.context_sentence = req.original_text
            db.commit()
            return AddCorrectionPendingResponse(status="reopened", vocab_item_id=existing.id, term=existing.term)

    item = VocabItem(
        user_id=user.id,
        language=req.language,
        term=term,
        translation=translation or term,
        context_sentence=req.original_text,
        source="correction",
        status="pending",
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return AddCorrectionPendingResponse(status="created", vocab_item_id=item.id, term=item.term)


__all__ = ["SpendCapExceeded", "run_correction", "add_correction_pending"]
