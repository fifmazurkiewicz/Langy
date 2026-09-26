import uuid
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock

from app.api.routes.vocab import list_due
from app.models import User


def test_list_due_includes_the_owning_vocab_id():
    vocab_id = uuid.uuid4()
    card_id = uuid.uuid4()
    card = SimpleNamespace(
        id=card_id,
        due_at=datetime.now(timezone.utc),
        vocab_item=SimpleNamespace(id=vocab_id, term="cat", translation="kot", flashcard_set_id=None),
    )
    query = MagicMock()
    query.join.return_value = query
    query.options.return_value = query
    query.filter.return_value = query
    query.order_by.return_value.all.return_value = [card]
    db = MagicMock()
    db.query.return_value = query
    user = User(id=uuid.uuid4(), email="dev@local", active_language="en-GB")

    result = list_due(user=user, db=db, language="en-GB")

    assert result["cards"][0]["id"] == str(card_id)
    assert result["cards"][0]["vocab_id"] == str(vocab_id)
