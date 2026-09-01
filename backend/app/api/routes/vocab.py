import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from fsrs import Rating
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.auth.deps import get_current_user
from app.db import get_db
from app.domain.fsrs.service import create_fsrs_card, review_card
from app.domain.profile.service import ensure_flashcard_sets_for_interests
from app.domain.vocab.export import accepted_vocab_for_export, format_quizlet_export
from app.models import FlashcardSet, FsrsCard, User, UserLanguageProfile, VocabItem
from app.models.vocab_mnemonic import VocabMnemonic

router = APIRouter()

UNCATEGORIZED_CATEGORY_KEY = "__other__"


def _due_cards_base_query(db: Session, user_id: uuid.UUID, lang: str | None, now: datetime):
    q = (
        db.query(FsrsCard)
        .join(VocabItem)
        .options(joinedload(FsrsCard.vocab_item))
        .filter(VocabItem.user_id == user_id, VocabItem.status == "accepted", FsrsCard.due_at <= now)
    )
    if lang:
        q = q.filter(VocabItem.language == lang)
    return q


def _apply_due_category_filter(q, category_key: str | None):
    if not category_key:
        return q
    if category_key == UNCATEGORIZED_CATEGORY_KEY:
        return q.filter(VocabItem.flashcard_set_id.is_(None))
    return q.join(FlashcardSet, VocabItem.flashcard_set_id == FlashcardSet.id).filter(
        FlashcardSet.category_key == category_key
    )


def _category_key_for_vocab(db: Session, item: VocabItem) -> str | None:
    if not item.flashcard_set_id:
        return None
    card_set = db.get(FlashcardSet, item.flashcard_set_id)
    return card_set.category_key if card_set else None


class VocabDecision(BaseModel):
    action: str  # accept | reject


class ReviewRequest(BaseModel):
    rating: str  # again | hard | good | easy


RATING_MAP = {
    "again": Rating.Again,
    "hard": Rating.Hard,
    "good": Rating.Good,
    "easy": Rating.Easy,
}


@router.get("/accepted")
def list_accepted(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    language: str | None = None,
) -> dict:
    lang = language or user.active_language
    items = accepted_vocab_for_export(db, user.id, lang)
    set_ids = {i.flashcard_set_id for i in items if i.flashcard_set_id}
    category_by_set_id: dict[uuid.UUID, str] = {}
    if set_ids:
        for card_set in db.query(FlashcardSet).filter(FlashcardSet.id.in_(set_ids)).all():
            category_by_set_id[card_set.id] = card_set.category_key
    return {
        "items": [
            {
                "id": str(i.id),
                "term": i.term,
                "translation": i.translation,
                "context_sentence": i.context_sentence,
                "source": i.source,
                "language": i.language,
                "category_key": category_by_set_id.get(i.flashcard_set_id) if i.flashcard_set_id else None,
            }
            for i in items
        ]
    }


@router.get("/pending")
def list_pending(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    language: str | None = None,
) -> dict:
    lang = language or user.active_language
    q = db.query(VocabItem).filter(VocabItem.user_id == user.id, VocabItem.status == "pending")
    if lang:
        q = q.filter(VocabItem.language == lang)
    items = q.order_by(VocabItem.created_at.desc()).all()
    set_ids = {i.flashcard_set_id for i in items if i.flashcard_set_id}
    category_by_set_id: dict[uuid.UUID, str] = {}
    if set_ids:
        for card_set in db.query(FlashcardSet).filter(FlashcardSet.id.in_(set_ids)).all():
            category_by_set_id[card_set.id] = card_set.category_key
    return {
        "items": [
            {
                "id": str(i.id),
                "term": i.term,
                "translation": i.translation,
                "context_sentence": i.context_sentence,
                "source": i.source,
                "language": i.language,
                "category_key": category_by_set_id.get(i.flashcard_set_id) if i.flashcard_set_id else None,
            }
            for i in items
        ]
    }


@router.get("/due")
def list_due(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    language: str | None = None,
    category_key: str | None = None,
) -> dict:
    lang = language or user.active_language
    now = datetime.now(timezone.utc)
    q = _apply_due_category_filter(_due_cards_base_query(db, user.id, lang, now), category_key)
    cards = q.order_by(FsrsCard.due_at).all()
    return {
        "cards": [
            {
                "id": str(c.id),
                "term": c.vocab_item.term,
                "translation": c.vocab_item.translation,
                "due_at": c.due_at.isoformat(),
                "category_key": _category_key_for_vocab(db, c.vocab_item),
            }
            for c in cards
        ]
    }


@router.get("/export")
def export_quizlet(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    language: str | None = None,
    category_key: str | None = None,
    download: bool = False,
):
    lang = language or user.active_language
    items = accepted_vocab_for_export(db, user.id, lang, category_key)
    content = format_quizlet_export(items)
    if download:
        filename = f"langy-{lang or 'all'}.txt"
        return PlainTextResponse(
            content,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
            media_type="text/plain",
        )
    return {"content": content, "count": len(items)}


@router.get("/categories")
def list_vocab_categories(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    language: str | None = None,
) -> dict:
    lang = language or user.active_language
    now = datetime.now(timezone.utc)
    if lang:
        profile = (
            db.query(UserLanguageProfile)
            .filter(UserLanguageProfile.user_id == user.id, UserLanguageProfile.language == lang)
            .first()
        )
        if profile and profile.interests:
            ensure_flashcard_sets_for_interests(db, user.id, lang, profile.interests)
            db.commit()
    q = db.query(FlashcardSet).filter(FlashcardSet.user_id == user.id)
    if lang:
        q = q.filter(FlashcardSet.language == lang)
    sets = q.order_by(FlashcardSet.category_key).all()
    items = []
    for card_set in sets:
        accepted = (
            db.query(func.count(VocabItem.id))
            .filter(
                VocabItem.flashcard_set_id == card_set.id,
                VocabItem.status == "accepted",
            )
            .scalar()
        )
        due_count = (
            db.query(func.count(FsrsCard.id))
            .join(VocabItem)
            .filter(
                VocabItem.flashcard_set_id == card_set.id,
                VocabItem.status == "accepted",
                FsrsCard.due_at <= now,
            )
            .scalar()
        )
        items.append(
            {
                "id": str(card_set.id),
                "category_key": card_set.category_key,
                "language": card_set.language,
                "accepted_count": int(accepted or 0),
                "due_count": int(due_count or 0),
                "is_custom": bool(card_set.is_custom),
            }
        )
    other_due_count = int(
        _apply_due_category_filter(_due_cards_base_query(db, user.id, lang, now), UNCATEGORIZED_CATEGORY_KEY).count()
    )
    return {"items": items, "other_due_count": other_due_count}


@router.post("/cards/{card_id}/review")
def review_fsrs_card(
    card_id: str,
    body: ReviewRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    rating = RATING_MAP.get(body.rating.lower())
    if rating is None:
        raise HTTPException(status_code=400, detail="rating must be again, hard, good, or easy")
    fsrs = (
        db.query(FsrsCard)
        .join(VocabItem)
        .filter(FsrsCard.id == uuid.UUID(card_id), VocabItem.user_id == user.id)
        .first()
    )
    if fsrs is None:
        raise HTTPException(status_code=404, detail="Card not found")
    updated = review_card(db, fsrs, rating)
    return {
        "id": str(updated.id),
        "due_at": updated.due_at.isoformat(),
        "stability": float(updated.stability),
    }


@router.post("/{vocab_id}/decision")
def vocab_decision(
    vocab_id: str,
    body: VocabDecision,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    item = db.get(VocabItem, uuid.UUID(vocab_id))
    if not item or item.user_id != user.id:
        raise HTTPException(status_code=404, detail="Vocab not found")
    if body.action == "accept":
        item.status = "accepted"
        db.commit()
        if item.fsrs_card is None:
            create_fsrs_card(db, item)
    elif body.action == "reject":
        item.status = "rejected"
        db.commit()
    else:
        raise HTTPException(status_code=400, detail="action must be accept or reject")
    return {"id": str(item.id), "status": item.status}


@router.get("/pending/count")
def pending_count(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    count = db.query(VocabItem).filter(VocabItem.user_id == user.id, VocabItem.status == "pending").count()
    return {"count": count}


@router.delete("/{vocab_id}")
def delete_vocab(
    vocab_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    item = db.get(VocabItem, uuid.UUID(vocab_id))
    if not item or item.user_id != user.id:
        raise HTTPException(status_code=404, detail="Vocab not found")
    db.query(VocabMnemonic).filter(VocabMnemonic.vocab_item_id == item.id).update(
        {VocabMnemonic.vocab_item_id: None},
        synchronize_session=False,
    )
    db.delete(item)
    db.commit()
    return {"ok": True}
