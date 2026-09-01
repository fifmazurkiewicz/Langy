"""TTS provider abstraction — browser (client) vs ElevenLabs (server)."""

from __future__ import annotations

import base64
from typing import Protocol

import httpx

from app.config import get_settings

settings = get_settings()

ELEVENLABS_MODEL = "eleven_multilingual_v2"
TTS_METER_COST = 0.001


class TtsSynthesisResult:
    def __init__(
        self,
        *,
        provider: str,
        text: str,
        audio_bytes: bytes | None = None,
        content_type: str | None = None,
        voice_name: str | None = None,
    ) -> None:
        self.provider = provider
        self.text = text
        self.audio_bytes = audio_bytes
        self.content_type = content_type
        self.voice_name = voice_name

    def to_api_dict(self) -> dict:
        payload: dict = {
            "provider": self.provider,
            "text": self.text,
            "configured": self.audio_bytes is not None or self.provider == "browser",
        }
        if self.voice_name:
            payload["voice_name"] = self.voice_name
        if self.audio_bytes is not None and self.content_type:
            payload["content_type"] = self.content_type
            payload["audio_base64"] = base64.b64encode(self.audio_bytes).decode("ascii")
        return payload


class TtsProvider(Protocol):
    def synthesize(self, text: str, language: str) -> TtsSynthesisResult: ...


class BrowserTtsProvider:
    def synthesize(self, text: str, language: str) -> TtsSynthesisResult:
        voice_name = settings.tts_voice_name.strip() or None
        return TtsSynthesisResult(provider="browser", text=text, voice_name=voice_name)


class ElevenLabsTtsProvider:
    def __init__(self, api_key: str, voice_id: str) -> None:
        self.api_key = api_key
        self.voice_id = voice_id

    def synthesize(self, text: str, language: str) -> TtsSynthesisResult:
        if not text.strip():
            raise ValueError("Empty text")
        response = httpx.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{self.voice_id}",
            headers={
                "xi-api-key": self.api_key,
                "Content-Type": "application/json",
                "Accept": "audio/mpeg",
            },
            json={
                "text": text,
                "model_id": ELEVENLABS_MODEL,
                "language_code": _elevenlabs_language(language),
            },
            timeout=60.0,
        )
        if response.is_error:
            detail = response.text[:500]
            raise httpx.HTTPStatusError(
                f"ElevenLabs {response.status_code}: {detail}",
                request=response.request,
                response=response,
            )
        return TtsSynthesisResult(
            provider="elevenlabs",
            text=text,
            audio_bytes=response.content,
            content_type="audio/mpeg",
        )


def _elevenlabs_language(language: str) -> str:
    return language.split("-", 1)[0].lower() if language else "en"


def get_tts_provider(*, elevenlabs_voice_id: str | None = None) -> TtsProvider:
    provider = settings.tts_provider.strip().lower()
    if provider == "elevenlabs":
        voice_id = (elevenlabs_voice_id or settings.tts_voice_id or "").strip()
        if settings.elevenlabs_api_key and voice_id:
            return ElevenLabsTtsProvider(settings.elevenlabs_api_key, voice_id)
        raise ValueError("ElevenLabs TTS not configured (set ELEVENLABS_API_KEY and TTS_VOICE_ID)")
    return BrowserTtsProvider()


def tts_configured() -> bool:
    provider = settings.tts_provider.strip().lower()
    if provider == "elevenlabs":
        return bool(settings.elevenlabs_api_key and settings.tts_voice_id)
    return True


def voice_public_config() -> dict:
    provider = settings.tts_provider.strip().lower()
    if provider not in ("browser", "elevenlabs"):
        provider = "browser"
    cfg: dict = {
        "tts_provider": provider,
        "tts_configured": tts_configured(),
        "stt_end_silence_ms": max(500, min(settings.stt_end_silence_ms, 10000)),
    }
    if provider == "browser" and settings.tts_voice_name.strip():
        cfg["tts_voice_name"] = settings.tts_voice_name.strip()
    return cfg
