import uuid
from decimal import Decimal
from unittest.mock import MagicMock

import pytest

from app.domain.selection.schemas import AddSelectionPendingRequest, TranslateSelectionRequest
from app.domain.selection.service import add_selection_pending, translate_selection
from app.domain.spend_cap.service import SpendCapExceeded


class FakeUser:
    def __init__(self, cap: float = 10.0):
        self.id = uuid.uuid4()
        self.spend_cap_usd = Decimal(str(cap))


class FakeProvider:
    def complete_json(self, messages):
        return {
            "translation_pl": "cześć",
            "example_l2": "Hello there.",
            "example_pl": "Cześć.",
            "context_sentence": "Say hello.",
        }


def test_translate_at_cap_raises():
    db = MagicMock()
    db.scalar.return_value = 10.0
    db.query.return_value.filter.return_value.first.return_value = None
    user = FakeUser(10.0)
    req = TranslateSelectionRequest(span="hello", language="en-GB")
    with pytest.raises(SpendCapExceeded):
        translate_selection(db, user, req, provider=FakeProvider())


def test_add_pending_at_cap_raises():
    db = MagicMock()
    db.scalar.return_value = 10.0
    db.query.return_value.filter.return_value.first.return_value = None
    user = FakeUser(10.0)
    req = AddSelectionPendingRequest(span="hello", language="en-GB")
    with pytest.raises(SpendCapExceeded):
        add_selection_pending(db, user, req, provider=FakeProvider())
