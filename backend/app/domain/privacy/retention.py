from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models import Conversation, ConversationSummary, UserMemoryFact
from app.models.shadowing_session import ShadowingSession


def purge_expired_conversations(
    db: Session, retention_days: int, now: datetime | None = None
) -> int:
    if retention_days < 1:
        raise ValueError("retention_days must be positive")
    cutoff = (now or datetime.now(timezone.utc)) - timedelta(days=retention_days)
    ids = list(
        db.scalars(
            select(Conversation.id).where(
                Conversation.ended_at.is_not(None),
                Conversation.ended_at < cutoff,
            )
        )
    )
    if not ids:
        return 0
    db.execute(
        delete(ConversationSummary).where(ConversationSummary.conversation_id.in_(ids))
    )
    db.execute(
        delete(UserMemoryFact).where(UserMemoryFact.source_conversation_id.in_(ids))
    )
    db.execute(
        delete(ShadowingSession).where(ShadowingSession.conversation_id.in_(ids))
    )
    db.execute(delete(Conversation).where(Conversation.id.in_(ids)))
    db.commit()
    return len(ids)
