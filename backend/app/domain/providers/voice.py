"""Voice provider abstraction — Gemini Live (default) vs chained."""

from app.config import get_settings

settings = get_settings()


def get_voice_mode() -> str:
    return settings.voice_mode


def live_session_config() -> dict:
    return {
        "voice_mode": settings.voice_mode,
        "model": "gemini-2.0-flash-live-001",
        "configured": bool(settings.google_api_key),
    }
