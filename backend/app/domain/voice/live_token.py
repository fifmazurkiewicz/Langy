"""Mint ephemeral tokens for Gemini Live API (client-to-server WebSocket)."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import httpx

from app.config import get_settings

settings = get_settings()

LIVE_MODEL = "models/gemini-2.0-flash-live-001"


class LiveTokenError(Exception):
    pass


def _iso_z(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def mint_ephemeral_live_token(
    *,
    system_instruction: str,
    api_key: str | None = None,
) -> dict:
    key = api_key or settings.google_api_key
    if not key:
        raise LiveTokenError("GOOGLE_API_KEY not configured")

    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=30)
    new_session_expire = now + timedelta(minutes=2)

    payload = {
        "expireTime": _iso_z(expire),
        "newSessionExpireTime": _iso_z(new_session_expire),
        "uses": 1,
        "bidiGenerateContentSetup": {
            "model": LIVE_MODEL,
            "systemInstruction": {"parts": [{"text": system_instruction}]},
            "generationConfig": {
                "responseModalities": ["AUDIO"],
            },
        },
    }

    response = httpx.post(
        "https://generativelanguage.googleapis.com/v1alpha/authTokens",
        params={"key": key},
        json=payload,
        timeout=30.0,
    )
    if response.status_code >= 400:
        raise LiveTokenError(f"Token mint failed: {response.status_code} {response.text[:200]}")

    data = response.json()
    return {
        "token": data.get("name") or data.get("token"),
        "model": LIVE_MODEL,
        "api_version": "v1alpha",
        "expire_time": data.get("expireTime"),
    }
