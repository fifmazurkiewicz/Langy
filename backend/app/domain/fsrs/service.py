from datetime import datetime, timezone

from fsrs import Card, Rating, Scheduler
from sqlalchemy.orm import Session

from app.models import FsrsCard, VocabItem

_scheduler = Scheduler()


def create_fsrs_card(db: Session, vocab_item: VocabItem) -> FsrsCard:
    card = Card()
    fsrs = FsrsCard(
        vocab_item_id=vocab_item.id,
        stability=float(card.stability or 0),
        difficulty=float(card.difficulty or 0),
        due_at=card.due.replace(tzinfo=timezone.utc) if card.due.tzinfo is None else card.due,
        review_history={"reviews": []},
    )
    db.add(fsrs)
    db.commit()
    db.refresh(fsrs)
    return fsrs


def review_card(db: Session, fsrs: FsrsCard, rating: Rating) -> FsrsCard:
    due = fsrs.due_at.replace(tzinfo=None) if fsrs.due_at.tzinfo else fsrs.due_at
    if fsrs.stability == 0 and fsrs.difficulty == 0:
        card = Card(due=due)
    else:
        card = Card(
            stability=fsrs.stability,
            difficulty=fsrs.difficulty,
            due=due,
        )
    updated, _log = _scheduler.review_card(card, rating)
    fsrs.stability = float(updated.stability or 0)
    fsrs.difficulty = float(updated.difficulty or 0)
    new_due = updated.due
    fsrs.due_at = new_due.replace(tzinfo=timezone.utc) if new_due.tzinfo is None else new_due
    history = fsrs.review_history or {"reviews": []}
    history["reviews"].append({"rating": rating.name, "at": datetime.now(timezone.utc).isoformat()})
    fsrs.review_history = history
    db.commit()
    db.refresh(fsrs)
    return fsrs
