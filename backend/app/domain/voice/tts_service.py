"""Shared TTS synthesis for chat, shadowing, and voice API routes."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.domain.providers.tts import TTS_METER_COST, get_tts_provider, voice_public_config as base_voice_public_config
from app.domain.spend_cap.service import SpendCapExceeded, check_spend_cap, record_usage
from app.domain.voice.catalog import (
    CUSTOM_VOICE_KEY,
    DEFAULT_VOICE_KEY,
    is_valid_voice_key,
    resolve_elevenlabs_voice_id,
    voice_catalog_payload,
)
from app.models import User, UserLanguageProfile


def _get_language_profile(db: Session, user_id, language: str) -> UserLanguageProfile | None:
    return (
        db.query(UserLanguageProfile)
        .filter(UserLanguageProfile.user_id == user_id, UserLanguageProfile.language == language)
        .first()
    )


def resolve_voice_key(
    db: Session,
    user: User,
    language: str,
    voice_key_override: str | None = None,
) -> str:
    if voice_key_override is not None:
        if not is_valid_voice_key(language, voice_key_override):
            raise ValueError(f"Invalid voice key for {language}")
        return voice_key_override or DEFAULT_VOICE_KEY
    profile = _get_language_profile(db, user.id, language)
    stored = profile.tts_voice_key if profile else None
    if stored and is_valid_voice_key(language, stored):
        return stored
    return DEFAULT_VOICE_KEY


def resolve_custom_voice_id(
    db: Session,
    user: User,
    language: str,
    voice_key: str,
    *,
    custom_voice_id_override: str | None = None,
) -> str | None:
    if voice_key != CUSTOM_VOICE_KEY:
        return None
    if custom_voice_id_override is not None:
        return custom_voice_id_override.strip() or None
    profile = _get_language_profile(db, user.id, language)
    return profile.tts_custom_voice_id if profile else None


def synthesize_tts(
    db: Session,
    user: User,
    text: str,
    language: str,
    *,
    voice_key_override: str | None = None,
    custom_voice_id_override: str | None = None,
) -> dict:
    try:
        check_spend_cap(db, user)
    except SpendCapExceeded:
        raise
    stripped = text.strip()
    if not stripped:
        raise ValueError("Empty text")
    voice_key = resolve_voice_key(db, user, language, voice_key_override)
    custom_id = resolve_custom_voice_id(
        db, user, language, voice_key, custom_voice_id_override=custom_voice_id_override
    )
    elevenlabs_id = resolve_elevenlabs_voice_id(language, voice_key, custom_voice_id=custom_id)
    result = get_tts_provider(elevenlabs_voice_id=elevenlabs_id).synthesize(stripped, language)
    if result.provider == "elevenlabs" and result.audio_bytes:
        record_usage(db, user.id, "tts", TTS_METER_COST, provider="elevenlabs")
    payload = result.to_api_dict()
    payload["voice_key"] = voice_key
    return payload


def voice_public_config(
    db: Session,
    user: User,
    language: str | None = None,
) -> dict:
    lang = language or user.active_language or "en-GB"
    cfg = base_voice_public_config()
    voice_key = resolve_voice_key(db, user, lang)
    profile = _get_language_profile(db, user.id, lang)
    cfg.update(voice_catalog_payload(lang))
    cfg["tts_voice_key"] = voice_key
    cfg["tts_custom_voice_id"] = profile.tts_custom_voice_id if profile else None
    return cfg
