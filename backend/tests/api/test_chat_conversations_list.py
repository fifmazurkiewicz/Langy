import uuid
from datetime import datetime, timezone
from unittest.mock import MagicMock

from app.api.routes.chat import list_conversations
from app.models import Conversation, User


def test_list_conversations_builds_preview_without_name_error():
    """Regression: cc2206b dropped transcript imports and broke history with NameError."""
    user = User(id=uuid.uuid4(), email="t@test.com")
    conv = Conversation(
        id=uuid.uuid4(),
        user_id=user.id,
        language="en-GB",
        transcript="Agent: Welcome back!\nUser: Hello there.",
        started_at=datetime.now(timezone.utc),
    )

    conv_query = MagicMock()
    conv_query.filter.return_value = conv_query
    conv_query.order_by.return_value = conv_query
    conv_query.limit.return_value = conv_query
    conv_query.all.return_value = [conv]

    summary_query = MagicMock()
    summary_query.filter.return_value = summary_query
    summary_query.all.return_value = []

    db = MagicMock()
    db.query.side_effect = [conv_query, summary_query]

    result = list_conversations(user=user, db=db, language="en-GB")

    assert len(result["conversations"]) == 1
    item = result["conversations"][0]
    assert item["id"] == str(conv.id)
    assert item["language"] == "en-GB"
    assert item["preview"].startswith("Agent: Welcome back!")
    assert item["is_active"] is True
