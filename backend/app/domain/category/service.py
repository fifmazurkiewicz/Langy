import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.domain.providers.text import TextCompletionProvider, get_text_provider
from app.domain.spend_cap.service import SpendCapExceeded, check_spend_cap, record_usage
from app.models import FlashcardSet, Job, User, VocabItem

CATEGORY_GENERATE_COST = 0.02


def enqueue_category_jobs_for_user(db: Session, user_id: uuid.UUID, language: str) -> list[Job]:
    sets = (
        db.query(FlashcardSet)
        .filter(FlashcardSet.user_id == user_id, FlashcardSet.language == language)
        .all()
    )
    jobs: list[Job] = []
    for card_set in sets:
        job = Job(
            job_type="category_generate",
            payload={
                "user_id": str(user_id),
                "flashcard_set_id": str(card_set.id),
                "category_key": card_set.category_key,
                "language": language,
            },
            status="pending",
        )
        db.add(job)
        jobs.append(job)
    db.commit()
    for job in jobs:
        db.refresh(job)
    return jobs


def generate_category_words(
    db: Session,
    user: User,
    flashcard_set: FlashcardSet,
    *,
    provider: TextCompletionProvider | None = None,
) -> list[VocabItem]:
    provider = provider or get_text_provider()
    check_spend_cap(db, user, CATEGORY_GENERATE_COST)

    prompt = [
        {
            "role": "system",
            "content": (
                "Generate 5 vocabulary flashcard candidates for a language learner. "
                'Return JSON: {"candidates":[{"term":"","translation_pl":"","context":""}]}. '
                "L1 is Polish. Terms in target language."
            ),
        },
        {
            "role": "user",
            "content": f"Language: {flashcard_set.language}\nCategory: {flashcard_set.category_key}",
        },
    ]
    result = provider.complete_json(prompt)
    candidates = result.get("candidates", [])
    created: list[VocabItem] = []

    for c in candidates:
        term = (c.get("term") or "").strip()
        if not term:
            continue
        existing = (
            db.query(VocabItem)
            .filter(
                VocabItem.user_id == user.id,
                VocabItem.language == flashcard_set.language,
                VocabItem.term == term,
            )
            .first()
        )
        if existing:
            if existing.status == "rejected":
                existing.status = "pending"
                existing.translation = c.get("translation_pl") or existing.translation
                existing.context_sentence = c.get("context")
                existing.source = "category_generated"
                existing.flashcard_set_id = flashcard_set.id
                created.append(existing)
            continue
        item = VocabItem(
            user_id=user.id,
            language=flashcard_set.language,
            term=term,
            translation=c.get("translation_pl") or "",
            context_sentence=c.get("context"),
            flashcard_set_id=flashcard_set.id,
            source="category_generated",
            status="pending",
        )
        db.add(item)
        created.append(item)

    record_usage(db, user.id, "category_generate", CATEGORY_GENERATE_COST, provider="text")
    db.commit()
    for item in created:
        db.refresh(item)
    return created


def process_category_job(db: Session, job: Job, provider: TextCompletionProvider | None = None) -> None:
    payload: dict[str, Any] = job.payload
    user = db.get(User, uuid.UUID(payload["user_id"]))
    card_set = db.get(FlashcardSet, uuid.UUID(payload["flashcard_set_id"]))
    if user is None or card_set is None:
        job.status = "failed"
        db.commit()
        return
    try:
        generate_category_words(db, user, card_set, provider=provider)
        job.status = "done"
    except SpendCapExceeded:
        job.status = "failed"
    except Exception:
        job.status = "failed"
    from datetime import datetime, timezone

    job.processed_at = datetime.now(timezone.utc)
    db.commit()
