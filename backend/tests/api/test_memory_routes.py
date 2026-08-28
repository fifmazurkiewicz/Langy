from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_memory_facts_requires_auth():
    assert client.get("/api/memory/facts").status_code == 401


def test_memory_summaries_requires_auth():
    assert client.get("/api/memory/summaries").status_code == 401


def test_add_language_requires_auth():
    assert client.post("/api/profile/languages", json={"language": "de"}).status_code == 401
