"""Shared language and profile helpers."""

SUPPORTED_LANGUAGES = ["en-GB", "en-US", "de", "es", "it"]


def interest_category_key(interest: str) -> str:
    return interest.split(":", 1)[0].strip() if interest else ""
