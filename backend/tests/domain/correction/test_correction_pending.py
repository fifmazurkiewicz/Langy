import uuid
from decimal import Decimal
from unittest.mock import MagicMock

import pytest

from app.domain.correction.schemas import AddCorrectionPendingRequest, CorrectionRequest
from app.domain.correction.service import add_correction_pending, run_correction


class FakeUser:
    def __init__(self, cap: float = 10.0):
        self.id = uuid.uuid4()
        self.spend_cap_usd = Decimal(str(cap))


class GrammarProvider:
    def complete_json(self, messages):
        if "turn_correction" in messages[0]["content"] or "substantive" in messages[0]["content"].lower():
            return {
                "is_corrected": True,
                "corrected_text": "I went to the shop",
                "explanation_pl": "Czas przeszły.",
                "mistake_type": "Grammar",
            }
        return {"translation_pl": "poszedłem do sklepu"}


def test_run_correction_happy_path():
    db = MagicMock()
    db.scalar.return_value = 0.0
    user = FakeUser()
    req = CorrectionRequest(text="I go to shop yesterday", language="en-GB", mode="check")
    result = run_correction(db, user, req, provider=GrammarProvider())
    assert result.is_corrected is True
    assert result.corrected_text == "I went to the shop"
    assert result.mistake_type == "Grammar"
    assert result.explanation_pl == "Czas przeszły."


def test_add_correction_pending_creates_item():
    db = MagicMock()
    db.scalar.return_value = 0.0
    db.query.return_value.filter.return_value.first.return_value = None

    def fake_refresh(item):
        item.id = uuid.uuid4()

    db.refresh.side_effect = fake_refresh
    user = FakeUser()
    req = AddCorrectionPendingRequest(
        original_text="I go shop",
        corrected_text="I went to the shop",
        language="en-GB",
        explanation_pl="Czas przeszly.",
    )
    result = add_correction_pending(db, user, req, provider=GrammarProvider())
    assert result.status == "created"
    assert result.term == "I went to the shop"
    db.add.assert_called()
    db.commit.assert_called()


def test_add_correction_pending_already_exists():
    db = MagicMock()
    db.scalar.return_value = 0.0
    existing = MagicMock()
    existing.id = uuid.uuid4()
    existing.term = "hello"
    existing.status = "pending"
    db.query.return_value.filter.return_value.first.return_value = existing
    user = FakeUser()
    req = AddCorrectionPendingRequest(
        original_text="helo",
        corrected_text="hello",
        language="en-GB",
    )
    result = add_correction_pending(db, user, req, provider=GrammarProvider())
    assert result.status == "already_exists"
