"""Exercise the real category-job failure boundary with a fake provider/database."""

import json
import uuid
from unittest.mock import MagicMock

import pytest
import sentry_sdk

from app.domain.category.service import process_category_job
from app.domain.error_reporting import set_error_reporter
from app.models import FlashcardSet, Job, User
from app.monitoring import capture_error, init_sentry
from tests.test_sentry_monitoring import DSN, PRIVATE, MemoryTransport


@pytest.mark.parametrize("cap,expected_errors", [(10, 1), (0, 0)])
def test_terminal_provider_failure_is_reported_but_budget_denial_is_normal(
    monkeypatch: pytest.MonkeyPatch,
    cap: int,
    expected_errors: int,
) -> None:
    monkeypatch.setenv("SENTRY_ENABLED", "true")
    monkeypatch.setenv("SENTRY_DSN", DSN)
    previous = sentry_sdk.get_client()
    transport = MemoryTransport()
    user = User(id=uuid.uuid4(), spend_cap_usd=cap)
    card_set = FlashcardSet(
        id=uuid.uuid4(), user_id=user.id, language="en", category_key=PRIVATE
    )
    job = Job(
        status="pending",
        payload={"user_id": str(user.id), "flashcard_set_id": str(card_set.id)},
    )
    database = MagicMock()
    database.get.side_effect = [user, card_set]
    database.scalar.return_value = 0
    provider = MagicMock()
    provider.complete_json.side_effect = RuntimeError(PRIVATE)
    try:
        assert init_sentry("langy-api", transport=transport)
        set_error_reporter(capture_error)
        process_category_job(database, job, provider=provider)
        assert job.status == "failed"
        assert job.processed_at is not None
        assert len(transport.envelopes) == expected_errors
        assert PRIVATE not in json.dumps(
            [envelope.get_event() for envelope in transport.envelopes]
        )
    finally:
        set_error_reporter(None)
        sentry_sdk.get_client().close()
        sentry_sdk.get_global_scope().set_client(previous)
