from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_privacy_export_requires_auth():
    assert client.get("/api/privacy/export").status_code == 401


def test_notice_acknowledgement_requires_auth():
    response = client.post(
        "/api/privacy/notices/acknowledge",
        json={"notice_key": "ai_first_use", "notice_version": "2026-09-13"},
    )
    assert response.status_code == 401


def test_account_deletion_requires_auth():
    response = client.request(
        "DELETE", "/api/privacy/account", json={"confirmation": "DELETE"}
    )
    assert response.status_code == 401
