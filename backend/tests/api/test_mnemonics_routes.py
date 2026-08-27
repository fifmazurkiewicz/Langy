from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_mnemonics_needs_auth():
    r = client.get("/api/mnemonics/needs")
    assert r.status_code == 401


def test_mnemonics_generate_auth():
    r = client.post("/api/mnemonics/generate", json={"term": "hello", "language": "en-GB"})
    assert r.status_code == 401
