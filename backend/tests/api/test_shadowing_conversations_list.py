import uuid
from datetime import datetime, timezone
from unittest.mock import MagicMock

from app.api.routes.shadowing import list_conversations
from app.models import Conversation, User


def test_list_conversations_includes_snippet_lines_from_end():
    user = User(id=uuid.uuid4(), email="t@test.com")
    body = "\n".join(
        [
            "Agent: Opening",
            "User: First",
            "Agent: Middle",
            "User: Near end",
            "Agent: Closing line",
        ]
    )
    conv = Conversation(
        id=uuid.uuid4(),
        user_id=user.id,
        language="en-GB",
        transcript=body,
        started_at=datetime.now(timezone.utc),
        ended_at=datetime.now(timezone.utc),
    )

    conv_query = MagicMock()
    conv_query.filter.return_value = conv_query
    conv_query.order_by.return_value = conv_query
    conv_query.limit.return_value = conv_query
    conv_query.all.return_value = [conv]

    db = MagicMock()
    db.query.return_value = conv_query

    result = list_conversations(user=user, db=db, language="en-GB")

    assert len(result["conversations"]) == 1
    item = result["conversations"][0]
    assert item["id"] == str(conv.id)
    assert "preview" in item
    assert item["snippet_lines"][-2:] == [
        {"role": "User", "text": "Near end"},
        {"role": "Agent", "text": "Closing line"},
    ]
    assert len(item["snippet_lines"]) == 5
