"""Per-language tutor voice catalog (ElevenLabs) + preview samples."""

from __future__ import annotations

import re
from dataclasses import dataclass

from app.config import get_settings
from app.domain.languages import SUPPORTED_LANGUAGES

settings = get_settings()

DEFAULT_VOICE_KEY = "default"
CUSTOM_VOICE_KEY = "custom"

_ELEVENLABS_VOICE_ID_RE = re.compile(r"^[a-zA-Z0-9]{10,64}$")


@dataclass(frozen=True)
class VoiceOption:
    key: str
    label: str
    description: str
    elevenlabs_voice_id: str | None = None

    def to_dict(self) -> dict:
        return {
            "key": self.key,
            "label": self.label,
            "description": self.description,
            "is_default": self.key == DEFAULT_VOICE_KEY,
            "is_custom": self.key == CUSTOM_VOICE_KEY,
        }


_CUSTOM_OPTION = VoiceOption(
    CUSTOM_VOICE_KEY,
    "Custom",
    "Paste a voice ID from your ElevenLabs library",
)


# ElevenLabs premade IDs — multilingual_v2; labels tuned per learning language.
_CATALOG: dict[str, list[VoiceOption]] = {
    "en-GB": [
        VoiceOption(DEFAULT_VOICE_KEY, "Default", "App default voice (from server config)"),
        VoiceOption("george", "George", "Warm British male", "JBFqnCBsd6RMkjVDRZzb"),
        VoiceOption("alice", "Alice", "Confident British female", "Xb7hH8MSUJpSbSDYk0k2"),
        VoiceOption("daniel", "Daniel", "Deep British male", "onwK4e9ZLuTAKqWW03F9"),
        VoiceOption("lily", "Lily", "Warm British female", "pFZP5JQG7iQjIQuC4Bku"),
        VoiceOption("charlotte", "Charlotte", "Clear European female", "XB0fDUnXU5pow7DhCDwa"),
    ],
    "en-US": [
        VoiceOption(DEFAULT_VOICE_KEY, "Default", "App default voice (from server config)"),
        VoiceOption("rachel", "Rachel", "Calm American female", "21m00Tcm4TlvDq8ikWAM"),
        VoiceOption("josh", "Josh", "Deep American male", "TxGEqnHWrfWFTfGW9XjX"),
        VoiceOption("bella", "Bella", "Soft American female", "EXAVITQu4vr4xnSDxMaL"),
        VoiceOption("adam", "Adam", "Narrative American male", "pNInz6obpgDQGcFmaJgB"),
        VoiceOption("matilda", "Matilda", "Friendly American female", "XrExE9yKIg1WjnnlVkGX"),
    ],
    "de": [
        VoiceOption(DEFAULT_VOICE_KEY, "Default", "App default voice (from server config)"),
        VoiceOption("charlotte", "Charlotte", "Clear female", "XB0fDUnXU5pow7DhCDwa"),
        VoiceOption("daniel", "Daniel", "Deep male", "onwK4e9ZLuTAKqWW03F9"),
        VoiceOption("matilda", "Matilda", "Warm female", "XrExE9yKIg1WjnnlVkGX"),
        VoiceOption("adam", "Adam", "Narrative male", "pNInz6obpgDQGcFmaJgB"),
        VoiceOption("elli", "Elli", "Expressive female", "MF3mGyEYCl7XYWbV9V6O"),
    ],
    "es": [
        VoiceOption(DEFAULT_VOICE_KEY, "Default", "App default voice (from server config)"),
        VoiceOption("eric", "Eric", "Latin American male", "cjVigY5qzO86Huf0OWal"),
        VoiceOption("jessica", "Jessica", "Expressive female", "cgSgspJ2msm6clMCkdW9"),
        VoiceOption("bella", "Bella", "Soft female", "EXAVITQu4vr4xnSDxMaL"),
        VoiceOption("adam", "Adam", "Narrative male", "pNInz6obpgDQGcFmaJgB"),
        VoiceOption("matilda", "Matilda", "Warm female", "XrExE9yKIg1WjnnlVkGX"),
    ],
    "it": [
        VoiceOption(DEFAULT_VOICE_KEY, "Default", "App default voice (from server config)"),
        VoiceOption("giulia", "Giulia", "Natural Italian female", "Xb7hH8MSUJpSbSDYk0k2"),
        VoiceOption("marco", "Marco", "Warm Italian male", "JBFqnCBsd6RMkjVDRZzb"),
        VoiceOption("elena", "Elena", "Bright Italian female", "XrExE9yKIg1WjnnlVkGX"),
        VoiceOption("luca", "Luca", "Clear Italian male", "onwK4e9ZLuTAKqWW03F9"),
        VoiceOption("sofia", "Sofia", "Expressive Italian female", "MF3mGyEYCl7XYWbV9V6O"),
    ],
}

PREVIEW_SAMPLES: dict[str, str] = {
    "en-GB": "Good morning! Shall we practise speaking together today?",
    "en-US": "Hi there! Ready to practice your English today?",
    "de": "Guten Morgen! Sollen wir heute zusammen Sprechen üben?",
    "es": "¡Buenos días! ¿Practicamos a hablar juntos hoy?",
    "it": "Buongiorno! Facciamo pratica di conversazione oggi?",
}


def normalize_language(language: str) -> str:
    if language in _CATALOG:
        return language
    base = language.split("-", 1)[0]
    for code in SUPPORTED_LANGUAGES:
        if code == language or code.startswith(f"{base}-"):
            return code
    if base in _CATALOG:
        return base
    return "en-GB"


def is_valid_elevenlabs_voice_id(voice_id: str | None) -> bool:
    if not voice_id:
        return False
    return bool(_ELEVENLABS_VOICE_ID_RE.match(voice_id.strip()))


def list_voices_for_language(language: str) -> list[VoiceOption]:
    base = list(_CATALOG.get(normalize_language(language), _CATALOG["en-GB"]))
    return [*base, _CUSTOM_OPTION]


def get_voice_option(language: str, voice_key: str | None) -> VoiceOption:
    key = voice_key or DEFAULT_VOICE_KEY
    for option in list_voices_for_language(language):
        if option.key == key:
            return option
    raise ValueError(f"Unknown voice key: {key}")


def is_valid_voice_key(language: str, voice_key: str | None) -> bool:
    if not voice_key or voice_key == DEFAULT_VOICE_KEY:
        return True
    if voice_key == CUSTOM_VOICE_KEY:
        return True
    try:
        get_voice_option(language, voice_key)
        return True
    except ValueError:
        return False


def resolve_elevenlabs_voice_id(
    language: str,
    voice_key: str | None,
    *,
    custom_voice_id: str | None = None,
) -> str:
    key = voice_key or DEFAULT_VOICE_KEY
    if key == CUSTOM_VOICE_KEY:
        cid = (custom_voice_id or "").strip()
        if not is_valid_elevenlabs_voice_id(cid):
            raise ValueError("Custom ElevenLabs voice ID required (10–64 alphanumeric characters)")
        return cid
    option = get_voice_option(language, key)
    if option.key == DEFAULT_VOICE_KEY or not option.elevenlabs_voice_id:
        default_id = settings.tts_voice_id.strip()
        if not default_id:
            raise ValueError("Default TTS voice not configured (set TTS_VOICE_ID)")
        return default_id
    return option.elevenlabs_voice_id


def voice_catalog_payload(language: str) -> dict:
    lang = normalize_language(language)
    return {
        "language": lang,
        "preview_sample": PREVIEW_SAMPLES.get(lang, PREVIEW_SAMPLES["en-GB"]),
        "voices": [v.to_dict() for v in list_voices_for_language(lang)],
    }
