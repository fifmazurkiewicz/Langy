from sqlalchemy.orm import Session

from app.models import FlashcardSet, VocabItem


def format_quizlet_export(items: list[VocabItem]) -> str:
    lines = [f"{item.term}\t{item.translation}" for item in items]
    return "\n".join(lines)


def accepted_vocab_for_export(
    db: Session,
    user_id,
    language: str | None = None,
    category_key: str | None = None,
) -> list[VocabItem]:
    q = db.query(VocabItem).filter(VocabItem.user_id == user_id, VocabItem.status == "accepted")
    if language:
        q = q.filter(VocabItem.language == language)
    if category_key:
        q = q.join(FlashcardSet, VocabItem.flashcard_set_id == FlashcardSet.id).filter(
            FlashcardSet.category_key == category_key
        )
    return q.order_by(VocabItem.term).all()
