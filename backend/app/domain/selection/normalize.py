from __future__ import annotations

import unicodedata


def normalize_span(raw: str) -> str:
    text = unicodedata.normalize("NFC", raw or "")
    return " ".join(text.split())


def dedup_key(user_id: str, language: str, raw: str) -> tuple[str, str, str]:
    return (user_id, language, normalize_span(raw).casefold())
