import uuid
from unittest.mock import MagicMock

import pytest

from app.domain.chat.service import ConversationDeleteError, delete_conversation


class FakeUser:
    def __init__(self, user_id: uuid.UUID | None = None):
        self.id = user_id or uuid.uuid4()


class FakeConversation:
    def __init__(self, user_id: uuid.UUID, ended: bool = True):
        self.id = uuid.uuid4()
        self.user_id = user_id
        self.ended_at = object() if ended else None


def test_delete_conversation_blocks_active_session():
    user = FakeUser()
    conversation = FakeConversation(user.id, ended=False)
    db = MagicMock()
    db.get.return_value = conversation

    with pytest.raises(ConversationDeleteError, match="End the session"):
        delete_conversation(db, user, conversation.id)


def test_delete_conversation_not_found():
    db = MagicMock()
    db.get.return_value = None
    user = FakeUser()

    with pytest.raises(ConversationDeleteError, match="not found"):
        delete_conversation(db, user, uuid.uuid4())
