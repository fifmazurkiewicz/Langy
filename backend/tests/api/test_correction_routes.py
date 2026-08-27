from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_correction_requires_auth():
    r = client.post(
        "/api/chat/correction",
        json={"text": "I go shop", "language": "en-GB", "mode": "check"},
    )
    assert r.status_code == 401
