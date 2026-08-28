"""Shared language and profile helpers."""

SUPPORTED_LANGUAGES = ["en-GB", "en-US", "de", "es", "it"]


def interest_category_key(interest: str) -> str:
    if not interest:
        return ""
    if interest.startswith("other:"):
        slug = interest.split(":", 1)[1].strip().lower().replace(" ", "_")
        return f"custom_{slug}"[:64] if slug else "other"
    return interest.split(":", 1)[0].strip()
