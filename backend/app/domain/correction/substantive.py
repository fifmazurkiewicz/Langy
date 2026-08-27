from __future__ import annotations

import re


def _normalize_compare(text: str) -> str:
    lowered = text.lower().strip()
    return re.sub(r"[^\w\s]", "", lowered, flags=re.UNICODE).strip()


def is_substantive_diff(original: str, corrected: str) -> bool:
    return _normalize_compare(original) != _normalize_compare(corrected)
