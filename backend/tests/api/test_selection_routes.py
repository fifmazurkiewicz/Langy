from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)
DEV_HEADERS = {"Authorization": "Bearer dev-token"}


def test_translate_requires_auth():
    r = client.post("/api/chat/selection/translate", json={"span": "hello", "language": "en-GB"})
    assert r.status_code == 401
