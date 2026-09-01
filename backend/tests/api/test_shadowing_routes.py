from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_shadowing_requires_auth():
    r = client.post(
        "/api/shadowing/sessions",
        json={"language": "en-GB", "topic": "travel", "show_text": True, "audio_mode": "tts"},
    )
    assert r.status_code == 401


def test_voice_synthesize_requires_auth():
    r = client.post("/api/voice/synthesize", json={"text": "hello"})
    assert r.status_code == 401


def test_list_conversations_requires_auth():
    r = client.get("/api/shadowing/conversations")
    assert r.status_code == 401


def test_voice_config_requires_auth():
    r = client.get("/api/voice/config")
    assert r.status_code == 401
