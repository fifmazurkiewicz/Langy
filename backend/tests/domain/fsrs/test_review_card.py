from datetime import datetime, timezone
from unittest.mock import MagicMock

from fsrs import Rating

from app.domain.fsrs.service import review_card


class FakeFsrs:
    def __init__(self):
        self.id = "test"
        self.stability = 0.0
        self.difficulty = 0.0
        self.due_at = datetime.now(timezone.utc)
        self.review_history = {"reviews": []}


def test_review_card_handles_unreviewed_zero_state():
    fsrs = FakeFsrs()
    db = MagicMock()

    updated = review_card(db, fsrs, Rating.Good)

    assert updated.stability > 0
    assert updated.difficulty > 0
    db.commit.assert_called_once()
