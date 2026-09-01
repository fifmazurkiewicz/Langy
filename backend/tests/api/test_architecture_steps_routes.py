from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_vocab_export_auth():
    r = client.get("/api/vocab/export")
    assert r.status_code == 401


def test_vocab_accepted_auth():
    r = client.get("/api/vocab/accepted")
    assert r.status_code == 401


def test_plan_auth():
    r = client.get("/api/plan")
    assert r.status_code == 401


def test_admin_users_auth():
    r = client.get("/api/admin/users")
    assert r.status_code == 401


def test_live_token_auth():
    r = client.post("/api/chat/live-token", json={})
    assert r.status_code == 401


def test_categories_generate_auth():
    r = client.post("/api/categories/00000000-0000-4000-8000-000000000001/generate")
    assert r.status_code == 401
