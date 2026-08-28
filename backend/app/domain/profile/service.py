import uuid

from sqlalchemy.orm import Session

from app.domain.category.service import enqueue_category_jobs_for_user, process_category_job
from app.domain.languages import interest_category_key
from app.models import FlashcardSet


def ensure_flashcard_sets_for_interests(
    db: Session,
    user_id: uuid.UUID,
    language: str,
    interests: list[str] | None,
) -> list[str]:
    """Create flashcard sets for interests that lack a set. Returns new category keys."""
    new_keys: list[str] = []
    for interest in interests or []:
        key = interest_category_key(interest)
        if not key:
            continue
        exists = (
            db.query(FlashcardSet)
            .filter(
                FlashcardSet.user_id == user_id,
                FlashcardSet.language == language,
                FlashcardSet.category_key == key,
            )
            .first()
        )
        if exists is None:
            db.add(
                FlashcardSet(
                    user_id=user_id,
                    language=language,
                    category_key=key,
                    is_custom=False,
                )
            )
            new_keys.append(key)
    if new_keys:
        db.flush()
    return new_keys


def enqueue_jobs_for_new_interest_sets(
    db: Session,
    user_id: uuid.UUID,
    language: str,
    new_keys: list[str],
) -> None:
    if not new_keys:
        return
    all_jobs = enqueue_category_jobs_for_user(db, user_id, language)
    for job in all_jobs:
        payload = job.payload or {}
        if payload.get("category_key") in new_keys:
            process_category_job(db, job)
