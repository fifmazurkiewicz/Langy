"""promptfoo custom provider — uses MockTextProvider (no API keys in CI)."""

from __future__ import annotations

import json
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[2]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.domain.providers.text import MockTextProvider  # noqa: E402


def call_api(prompt: str, options: dict, context: dict) -> dict:
    provider = MockTextProvider()
    vars_ = context.get("vars") or {}
    lines = [ln.strip() for ln in prompt.strip().splitlines() if ln.strip()]
    messages: list[dict[str, str]] = []
    if lines:
        messages.append({"role": "system", "content": lines[0]})
        if len(lines) > 1:
            messages.append({"role": "user", "content": "\n".join(lines[1:])})
    if vars_.get("user_text"):
        if not messages:
            messages.append({"role": "system", "content": "turn_correction"})
        messages.append({"role": "user", "content": vars_["user_text"]})
    if vars_.get("transcript") and len(messages) < 2:
        messages.append({"role": "user", "content": vars_["transcript"]})
    if not messages:
        messages = [{"role": "system", "content": prompt}]

    result = provider.complete_json(messages)
    return {"output": json.dumps(result, ensure_ascii=False)}
