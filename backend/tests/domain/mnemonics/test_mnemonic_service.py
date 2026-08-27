import uuid
from decimal import Decimal
from unittest.mock import MagicMock

import pytest

from app.domain.mnemonics.schemas import GenerateMnemonicRequest
from app.domain.mnemonics.service import generate_mnemonic


class FakeUser:
    def __init__(self):
        self.id = uuid.uuid4()
        self.spend_cap_usd = Decimal("10")


class MnemonicProvider:
    calls = 0

    def complete_json(self, messages):
        MnemonicProvider.calls += 1
        return {
            "association_pl": "Skojarzenie",
            "example_l2": "Hello world.",
            "example_pl": "Witaj świecie.",
        }


class FakeVocab:
    def __init__(self):
        self.id = uuid.uuid4()
        self.term = "hello"
        self.status = "accepted"


def test_generate_cache_hit_skips_provider():
    db = MagicMock()
    cached = MagicMock()
    cached.association_pl = "cached"
    cached.example_l2 = "ex"
    cached.example_pl = "ex pl"
    db.query.return_value.filter.return_value.first.side_effect = [FakeVocab(), cached]
    MnemonicProvider.calls = 0
    user = FakeUser()
    req = GenerateMnemonicRequest(term="hello", language="en-GB", regenerate=False)
    result = generate_mnemonic(db, user, req, provider=MnemonicProvider())
    assert result.from_cache is True
    assert result.association_pl == "cached"
    assert MnemonicProvider.calls == 0


def test_generate_at_cap_raises():
    from app.domain.spend_cap.service import SpendCapExceeded

    db = MagicMock()
    db.scalar.return_value = 10.0
    db.query.return_value.filter.return_value.first.return_value = FakeVocab()
    user = FakeUser()
    user.spend_cap_usd = Decimal("10")
    req = GenerateMnemonicRequest(term="hello", language="en-GB", regenerate=True)
    with pytest.raises(SpendCapExceeded):
        generate_mnemonic(db, user, req, provider=MnemonicProvider())
