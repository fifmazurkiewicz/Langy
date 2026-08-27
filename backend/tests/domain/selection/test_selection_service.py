import uuid
from decimal import Decimal
from unittest.mock import MagicMock

from app.domain.selection.schemas import AddSelectionPendingRequest, TranslateSelectionRequest
from app.domain.selection.service import add_selection_pending, translate_selection


class FakeUser:
    def __init__(self):
        self.id = uuid.uuid4()
        self.spend_cap_usd = Decimal("10")


class FakeProvider:
    call_count = 0

    def complete_json(self, messages):
        FakeProvider.call_count += 1
        return {
            "translation_pl": "cześć",
            "example_l2": "Hello there.",
            "example_pl": "Cześć tam.",
            "context_sentence": "Say hello.",
        }


def test_translate_cache_hit_skips_provider():
    db = MagicMock()
    db.scalar.return_value = 0.0
    cached = MagicMock()
    cached.translation_pl = "cześć"
    cached.example_l2 = "Hi"
    cached.example_pl = "Hej"
    db.query.return_value.filter.return_value.first.return_value = cached
    FakeProvider.call_count = 0
    user = FakeUser()
    req = TranslateSelectionRequest(span="hello", language="en-GB")
    result = translate_selection(db, user, req, provider=FakeProvider())
    assert result.from_cache is True
    assert result.translation_pl == "cześć"
    assert FakeProvider.call_count == 0


def test_add_selection_pending_reopens_rejected():
    db = MagicMock()
    db.scalar.return_value = 0.0
    existing = MagicMock()
    existing.id = uuid.uuid4()
    existing.term = "hello"
    existing.status = "rejected"
    existing.translation = "old"
    db.query.return_value.filter.return_value.first.return_value = existing
    user = FakeUser()
    req = AddSelectionPendingRequest(span="hello", language="en-GB", translation_pl="cześć")
    result = add_selection_pending(db, user, req, provider=FakeProvider())
    assert result.status == "reopened"
    assert existing.status == "pending"
    assert existing.source == "transcript_selection"
