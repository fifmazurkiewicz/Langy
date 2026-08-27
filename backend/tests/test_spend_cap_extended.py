from decimal import Decimal
from unittest.mock import MagicMock
import uuid

import pytest

from app.domain.spend_cap.service import SpendCapExceeded, check_spend_cap, monthly_spend_usd


class FakeUser:
    id = uuid.uuid4()
    spend_cap_usd = Decimal("10")


def test_monthly_spend_at_exact_cap_blocks():
    db = MagicMock()
    db.scalar.return_value = 10.0
    with pytest.raises(SpendCapExceeded):
        check_spend_cap(db, FakeUser(), 0)


def test_monthly_spend_under_cap_allows():
    db = MagicMock()
    db.scalar.return_value = 9.99
    check_spend_cap(db, FakeUser(), 0.001)


def test_monthly_spend_usd_returns_float():
    db = MagicMock()
    db.scalar.return_value = 3.5
    assert monthly_spend_usd(db, uuid.uuid4()) == 3.5
