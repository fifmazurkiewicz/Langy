import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.auth.deps import get_current_user
from app.db import get_db
from app.domain.fsrs.service import create_fsrs_card
from app.models import FsrsCard, User, VocabItem

router = APIRouter()


class VocabDecision(BaseModel):
    action: str  # accept | reject


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
    return {
        "items": [
            {
                "id": str(i.id),
                "term": i.term,
                "translation": i.translation,
                "context_sentence": i.context_sentence,
                "source": i.source,
                "language": i.language,
            }
            for i in items
        ]
    }


@router.get("/due")
def list_due(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    language: str | None = None,
) -> dict:
    lang = language or user.active_language
    q = (
        db.query(FsrsCard)
        .join(VocabItem)
        .options(joinedload(FsrsCard.vocab_item))
        .filter(VocabItem.user_id == user.id, VocabItem.status == "accepted")
    )
    if lang:
        q = q.filter(VocabItem.language == lang)
    cards = q.all()
    return {
        "cards": [
            {
                "id": str(c.id),
                "term": c.vocab_item.term,
                "translation": c.vocab_item.translation,
                "due_at": c.due_at.isoformat(),
            }
            for c in cards
        ]
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
