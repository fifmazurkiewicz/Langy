from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock

import pytest

from app.domain.privacy.retention import purge_expired_conversations


def test_retention_rejects_non_positive_days():
    with pytest.raises(ValueError, match="positive"):
        purge_expired_conversations(MagicMock(), 0)


def test_retention_does_not_commit_when_nothing_expired():
    db = MagicMock()
    db.scalars.return_value = []
    assert purge_expired_conversations(db, 365, datetime.now(timezone.utc)) == 0
    db.commit.assert_not_called()


def test_retention_deletes_expired_conversation_graph():
    db = MagicMock()
    db.scalars.return_value = ["conversation-id"]
    now = datetime.now(timezone.utc)
    assert purge_expired_conversations(db, 365, now + timedelta(days=1)) == 1
    assert db.execute.call_count == 4
    db.commit.assert_called_once()
