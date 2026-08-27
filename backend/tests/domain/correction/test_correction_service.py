import uuid
from decimal import Decimal
from unittest.mock import MagicMock

import pytest

from app.domain.correction.schemas import CorrectionRequest
from app.domain.correction.service import run_correction
from app.domain.spend_cap.service import SpendCapExceeded


class FakeUser:
    def __init__(self, cap: float = 10.0):
        self.id = uuid.uuid4()
        self.spend_cap_usd = Decimal(str(cap))


class FakeProvider:
    def complete_json(self, messages):
        return {
            "is_corrected": True,
            "corrected_text": "I go to the shop",
            "explanation_pl": "Brakuje przyimka.",
            "mistake_type": "Grammar",
        }


def test_run_correction_at_cap_raises():
    db = MagicMock()
    db.scalar.return_value = 10.0
    user = FakeUser(10.0)
    req = CorrectionRequest(text="I go shop", language="en-GB")
    with pytest.raises(SpendCapExceeded):
        run_correction(db, user, req, provider=FakeProvider())


def test_substantive_force_false():
    db = MagicMock()
    db.scalar.return_value = 0.0

    class PunctProvider:
        def complete_json(self, messages):
            return {
                "is_corrected": True,
                "corrected_text": "hello",
                "explanation_pl": "x",
                "mistake_type": "Grammar",
            }

    user = FakeUser()
    req = CorrectionRequest(text="Hello", language="en-GB")
    result = run_correction(db, user, req, provider=PunctProvider())
    assert result.is_corrected is False
