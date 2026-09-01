import base64
from unittest.mock import MagicMock, patch

import httpx
import pytest

from app.domain.providers.tts import (
    BrowserTtsProvider,
    ElevenLabsTtsProvider,
    get_tts_provider,
    tts_configured,
    voice_public_config,
)


def test_browser_tts_result():
    result = BrowserTtsProvider().synthesize("Hello", "en-GB")
    payload = result.to_api_dict()
    assert payload["provider"] == "browser"
    assert payload["text"] == "Hello"
    assert "audio_base64" not in payload


def test_elevenlabs_synthesize():
    mock_response = MagicMock()
    mock_response.is_error = False
    mock_response.content = b"\xff\xfb\x90"
    provider = ElevenLabsTtsProvider("test-key", "voice-123")
    with patch("app.domain.providers.tts.httpx.post", return_value=mock_response) as post:
        result = provider.synthesize("Good morning", "en-GB")
    post.assert_called_once()
    assert post.call_args.args[0].endswith("/voice-123")
    payload = result.to_api_dict()
    assert payload["provider"] == "elevenlabs"
    assert payload["content_type"] == "audio/mpeg"
    assert base64.b64decode(payload["audio_base64"]) == b"\xff\xfb\x90"


def test_get_tts_provider_elevenlabs_when_configured():
    with patch("app.domain.providers.tts.settings") as mock_settings:
        mock_settings.tts_provider = "elevenlabs"
        mock_settings.elevenlabs_api_key = "key"
        mock_settings.tts_voice_id = "vid"
        provider = get_tts_provider()
    assert isinstance(provider, ElevenLabsTtsProvider)
    assert provider.voice_id == "vid"


def test_get_tts_provider_custom_voice_id():
    with patch("app.domain.providers.tts.settings") as mock_settings:
        mock_settings.tts_provider = "elevenlabs"
        mock_settings.elevenlabs_api_key = "key"
        mock_settings.tts_voice_id = "default-vid"
        provider = get_tts_provider(elevenlabs_voice_id="custom-vid")
    assert provider.voice_id == "custom-vid"


def test_get_tts_provider_falls_back_to_browser():
    with patch("app.domain.providers.tts.settings") as mock_settings:
        mock_settings.tts_provider = "browser"
        provider = get_tts_provider()
    assert isinstance(provider, BrowserTtsProvider)


def test_get_tts_provider_elevenlabs_requires_credentials():
    with patch("app.domain.providers.tts.settings") as mock_settings:
        mock_settings.tts_provider = "elevenlabs"
        mock_settings.elevenlabs_api_key = ""
        mock_settings.tts_voice_id = ""
        with pytest.raises(ValueError, match="ElevenLabs"):
            get_tts_provider()


def test_tts_configured_elevenlabs_requires_key_and_voice():
    with patch("app.domain.providers.tts.settings") as mock_settings:
        mock_settings.tts_provider = "elevenlabs"
        mock_settings.elevenlabs_api_key = "k"
        mock_settings.tts_voice_id = "v"
        assert tts_configured() is True
        mock_settings.tts_voice_id = ""
        assert tts_configured() is False


def test_voice_public_config_clamps_silence():
    with patch("app.domain.providers.tts.settings") as mock_settings:
        mock_settings.tts_provider = "browser"
        mock_settings.tts_voice_name = "Google UK"
        mock_settings.stt_end_silence_ms = 99999
        cfg = voice_public_config()
    assert cfg["stt_end_silence_ms"] == 10000
    assert cfg["tts_voice_name"] == "Google UK"


def test_elevenlabs_http_error():
    mock_response = MagicMock()
    mock_response.is_error = True
    mock_response.status_code = 401
    mock_response.text = "Unauthorized"
    mock_response.request = MagicMock()
    provider = ElevenLabsTtsProvider("bad", "voice")
    with patch("app.domain.providers.tts.httpx.post", return_value=mock_response):
        with pytest.raises(httpx.HTTPStatusError):
            provider.synthesize("Hi", "en-GB")
