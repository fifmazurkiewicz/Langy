import uuid
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.api.routes.chat import end_session
from app.main import app
from app.models import Conversation, User


def test_preflight_caches_for_one_day():
    client = TestClient(app)
    response = client.options(
        "/api/health",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-max-age"] == "86400"


def test_end_session_only_enqueues_post_session_job():
    user = User(id=uuid.uuid4(), is_approved=True)
    conversation = Conversation(id=uuid.uuid4(), user_id=user.id, language="en-GB", transcript="User: Hi\n")
    db = MagicMock()
    db.get.return_value = conversation
    job = MagicMock(id=uuid.uuid4())

    with (
        patch("app.api.routes.chat.enqueue_post_session_jobs", return_value=job) as enqueue,
        patch("app.api.routes.chat.process_post_session_job") as process,
    ):
        response = end_session(conversation.id, user, db)

    assert response == {"ok": True, "job_id": str(job.id)}
    enqueue.assert_called_once_with(db, conversation.id, user.id)
    process.assert_not_called()
