import uuid
from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import MagicMock

import pytest

from app.domain.spend_cap.service import SpendCapExceeded, check_spend_cap, monthly_spend_usd


class FakeUser:
    def __init__(self, cap: float = 10.0):
        self.id = uuid.uuid4()
        self.spend_cap_usd = Decimal(str(cap))


def test_monthly_spend_empty_db():
    db = MagicMock()
    db.scalar.return_value = 0
    assert monthly_spend_usd(db, uuid.uuid4()) == 0.0


def test_check_spend_cap_allows_under_cap():
    db = MagicMock()
    db.scalar.return_value = 5.0
    user = FakeUser(10.0)
    check_spend_cap(db, user, 1.0)


def test_check_spend_cap_blocks_over_cap():
    db = MagicMock()
    db.scalar.return_value = 10.0
    user = FakeUser(10.0)
    with pytest.raises(SpendCapExceeded):
        check_spend_cap(db, user, 0.01)
