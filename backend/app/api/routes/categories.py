import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.db import get_db
from app.domain.category.service import generate_category_words, process_category_job
from app.domain.spend_cap.service import SpendCapExceeded
from app.models import FlashcardSet, Job, User, VocabItem

router = APIRouter()


@router.get("")
def list_categories(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    language: str | None = None,
) -> dict:
    lang = language or user.active_language
    q = db.query(FlashcardSet).filter(FlashcardSet.user_id == user.id)
    if lang:
        q = q.filter(FlashcardSet.language == lang)
    sets = q.order_by(FlashcardSet.category_key).all()
    items = []
    for card_set in sets:
        accepted = (
            db.query(func.count(VocabItem.id))
            .filter(VocabItem.flashcard_set_id == card_set.id, VocabItem.status == "accepted")
            .scalar()
        )
        items.append(
            {
                "id": str(card_set.id),
                "category_key": card_set.category_key,
                "language": card_set.language,
                "accepted_count": int(accepted or 0),
            }
        )
    return {"items": items}


@router.post("/{set_id}/generate")
def generate_for_category(
    set_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    card_set = db.get(FlashcardSet, uuid.UUID(set_id))
    if not card_set or card_set.user_id != user.id:
        raise HTTPException(status_code=404, detail="Category not found")
    try:
        created = generate_category_words(db, user, card_set)
    except SpendCapExceeded:
        raise HTTPException(status_code=402, detail="Monthly spend cap reached")
    return {"created": len(created), "pending_added": len(created)}


@router.post("/process-jobs")
def process_pending_category_jobs(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    jobs = (
        db.query(Job)
        .filter(Job.job_type == "category_generate", Job.status == "pending")
        .limit(10)
        .all()
    )
    done = 0
    for job in jobs:
        if job.payload.get("user_id") != str(user.id):
            continue
        process_category_job(db, job)
        done += 1
    return {"processed": done}
