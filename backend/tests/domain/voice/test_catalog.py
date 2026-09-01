from app.domain.voice.catalog import (
    CUSTOM_VOICE_KEY,
    DEFAULT_VOICE_KEY,
    get_voice_option,
    is_valid_elevenlabs_voice_id,
    list_voices_for_language,
    resolve_elevenlabs_voice_id,
    voice_catalog_payload,
)


def test_catalog_has_default_plus_five_and_custom_per_language():
    for lang in ("en-GB", "en-US", "de", "es", "it"):
        voices = list_voices_for_language(lang)
        assert len(voices) == 7
        assert voices[0].key == DEFAULT_VOICE_KEY
        assert voices[-1].key == CUSTOM_VOICE_KEY


def test_resolve_default_uses_env_voice_id():
    from unittest.mock import patch

    with patch("app.domain.voice.catalog.settings") as mock_settings:
        mock_settings.tts_voice_id = "env-default-id"
        assert resolve_elevenlabs_voice_id("en-GB", DEFAULT_VOICE_KEY) == "env-default-id"


def test_resolve_named_voice():
    option = get_voice_option("en-GB", "george")
    assert resolve_elevenlabs_voice_id("en-GB", "george") == option.elevenlabs_voice_id


def test_resolve_custom_voice_id():
    assert (
        resolve_elevenlabs_voice_id("en-GB", CUSTOM_VOICE_KEY, custom_voice_id="21m00Tcm4TlvDq8ikWAM")
        == "21m00Tcm4TlvDq8ikWAM"
    )


def test_custom_voice_id_validation():
    assert is_valid_elevenlabs_voice_id("21m00Tcm4TlvDq8ikWAM")
    assert not is_valid_elevenlabs_voice_id("bad id!")
    assert not is_valid_elevenlabs_voice_id("")


def test_catalog_payload_includes_preview():
    payload = voice_catalog_payload("de")
    assert payload["language"] == "de"
    assert "Guten Morgen" in payload["preview_sample"]
    assert len(payload["voices"]) == 7
    assert payload["voices"][-1]["is_custom"] is True
