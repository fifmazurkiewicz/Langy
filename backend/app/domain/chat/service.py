from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.models import Conversation, ConversationSummary, User, UserMemoryFact
from app.models.shadowing_session import ShadowingSession


class ConversationDeleteError(ValueError):
    pass


def delete_conversation(db: Session, user: User, conversation_id: uuid.UUID) -> None:
    conversation = db.get(Conversation, conversation_id)
    if not conversation or conversation.user_id != user.id:
        raise ConversationDeleteError("Session not found")
    if conversation.ended_at is None:
        raise ConversationDeleteError("End the session before deleting it")

    db.query(UserMemoryFact).filter(UserMemoryFact.source_conversation_id == conversation.id).update(
        {UserMemoryFact.source_conversation_id: None},
        synchronize_session=False,
    )
    db.query(ShadowingSession).filter(ShadowingSession.conversation_id == conversation.id).update(
        {ShadowingSession.conversation_id: None},
        synchronize_session=False,
    )
    db.query(ConversationSummary).filter(ConversationSummary.conversation_id == conversation.id).delete(
        synchronize_session=False
    )
    db.delete(conversation)
    db.commit()


__all__ = ["ConversationDeleteError", "delete_conversation"]
