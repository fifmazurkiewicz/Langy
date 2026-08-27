from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.domain.mnemonics.schemas import GenerateMnemonicRequest, MnemonicResponse
from app.domain.providers.text import TextCompletionProvider, get_text_provider
from app.domain.selection.normalize import normalize_span
from app.domain.spend_cap.service import SpendCapExceeded, check_spend_cap, record_usage
from app.models import User, VocabItem, VocabMnemonic

MNEMONIC_COST = 0.003


def _normalized(term: str) -> str:
    return normalize_span(term).casefold()


def _get_cache(db: Session, user_id: uuid.UUID, language: str, term: str) -> VocabMnemonic | None:
    return (
        db.query(VocabMnemonic)
        .filter(
            VocabMnemonic.user_id == user_id,
            VocabMnemonic.language == language,
            VocabMnemonic.normalized_term == _normalized(term),
        )
        .first()
    )


def _call_mnemonic_prompt(provider: TextCompletionProvider, term: str, language: str) -> dict[str, str]:
    messages = [
        {
            "role": "system",
            "content": (
                "Create a sound-association mnemonic in Polish for a language learner. "
                'Return JSON: {"association_pl":"","example_l2":"","example_pl":""}'
            ),
        },
        {"role": "user", "content": f"term ({language}): {term}"},
    ]
    data = provider.complete_json(messages)
    return {
        "association_pl": data.get("association_pl", ""),
        "example_l2": data.get("example_l2", f"I use {term} often."),
        "example_pl": data.get("example_pl", ""),
    }


def _get_accepted_vocab(db: Session, user_id: uuid.UUID, language: str, term: str) -> VocabItem:
    item = (
        db.query(VocabItem)
        .filter(
            VocabItem.user_id == user_id,
            VocabItem.language == language,
            VocabItem.term == term,
            VocabItem.status == "accepted",
        )
        .first()
    )
    if not item:
        raise ValueError("Accept the term first")
    return item


def list_needs_mnemonic(db: Session, user: User, language: str) -> list[dict]:
    accepted = (
        db.query(VocabItem)
        .filter(VocabItem.user_id == user.id, VocabItem.language == language, VocabItem.status == "accepted")
        .all()
    )
    cached_terms = {
        row.normalized_term
        for row in db.query(VocabMnemonic)
        .filter(VocabMnemonic.user_id == user.id, VocabMnemonic.language == language)
        .all()
    }
    needs = []
    for item in accepted:
        if _normalized(item.term) not in cached_terms:
            needs.append({"term": item.term, "translation": item.translation, "vocab_item_id": str(item.id)})
    return needs


def generate_mnemonic(
    db: Session,
    user: User,
    req: GenerateMnemonicRequest,
    provider: TextCompletionProvider | None = None,
) -> MnemonicResponse:
    vocab = _get_accepted_vocab(db, user.id, req.language, req.term)
    cached = _get_cache(db, user.id, req.language, req.term)
    if cached and not req.regenerate:
        return MnemonicResponse(
            term=req.term,
            language=req.language,
            association_pl=cached.association_pl,
            example_l2=cached.example_l2,
            example_pl=cached.example_pl,
            from_cache=True,
        )

    check_spend_cap(db, user)
    provider = provider or get_text_provider()
    data = _call_mnemonic_prompt(provider, req.term, req.language)
    record_usage(db, user.id, "gen_ai", MNEMONIC_COST, provider="mnemonic_generate")

    if cached:
        cached.association_pl = data["association_pl"]
        cached.example_l2 = data["example_l2"]
        cached.example_pl = data["example_pl"]
        cached.vocab_item_id = vocab.id
    else:
        db.add(
            VocabMnemonic(
                user_id=user.id,
                language=req.language,
                normalized_term=_normalized(req.term),
                vocab_item_id=vocab.id,
                association_pl=data["association_pl"],
                example_l2=data["example_l2"],
                example_pl=data["example_pl"],
            )
        )
    db.commit()
    return MnemonicResponse(
        term=req.term,
        language=req.language,
        association_pl=data["association_pl"],
        example_l2=data["example_l2"],
        example_pl=data["example_pl"],
        from_cache=False,
    )


def get_cached_mnemonic(db: Session, user: User, language: str, term: str) -> MnemonicResponse | None:
    cached = _get_cache(db, user.id, language, term)
    if not cached:
        return None
    return MnemonicResponse(
        term=term,
        language=language,
        association_pl=cached.association_pl,
        example_l2=cached.example_l2,
        example_pl=cached.example_pl,
        from_cache=True,
    )


__all__ = ["SpendCapExceeded", "generate_mnemonic", "get_cached_mnemonic", "list_needs_mnemonic"]
