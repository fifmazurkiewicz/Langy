import uuid
from unittest.mock import MagicMock

from app.api.routes.vocab import list_vocab_categories
from app.models import User


def test_list_vocab_categories_returns_other_due_count_without_name_error():
    """Regression: typo UNCategorized_CATEGORY_KEY crashed this endpoint with NameError."""
    user = User(
        id=uuid.uuid4(),
        email="dev@local",
        active_language="en-GB",
    )
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = None
    db.query.return_value.filter.return_value.order_by.return_value.all.return_value = []
    db.query.return_value.filter.return_value.scalar.return_value = 0
    db.query.return_value.join.return_value.filter.return_value.scalar.return_value = 0
    db.query.return_value.join.return_value.filter.return_value.count.return_value = 0

    result = list_vocab_categories(user=user, db=db, language="en-GB")

    assert isinstance(result["items"], list)
    assert "other_due_count" in result
