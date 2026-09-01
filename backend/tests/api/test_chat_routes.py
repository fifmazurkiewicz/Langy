from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)
AUTH = {"Authorization": "Bearer dev-token"}


def test_list_chat_conversations_requires_auth():
    r = client.get("/api/chat/conversations")
    assert r.status_code == 401


def test_resume_session_requires_auth():
    r = client.post("/api/chat/sessions/00000000-0000-4000-8000-000000000001/resume")
    assert r.status_code == 401


def test_delete_conversation_requires_auth():
    r = client.delete("/api/chat/conversations/00000000-0000-4000-8000-000000000001")
    assert r.status_code == 401
