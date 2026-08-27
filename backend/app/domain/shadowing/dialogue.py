from __future__ import annotations

import re
import uuid
from typing import Literal

from pydantic import BaseModel, Field


class DialogueLine(BaseModel):
    id: str
    role: Literal["agent", "user"]
    text: str


def lines_from_conversation_transcript(transcript: str) -> list[DialogueLine]:
    """Extract agent lines for shadowing practice (MVP: Agent lines only)."""
    lines: list[DialogueLine] = []
    for raw in transcript.splitlines():
        raw = raw.strip()
        if not raw:
            continue
        match = re.match(r"^(Agent|User):\s*(.+)$", raw, re.IGNORECASE)
        if not match:
            continue
        role = match.group(1).lower()
        text = match.group(2).strip()
        if role == "agent":
            lines.append(DialogueLine(id=str(uuid.uuid4()), role="agent", text=text))
    return lines


def generate_dialogue(provider, *, topic: str, language: str, cefr_level: str | None = None) -> list[DialogueLine]:
    messages = [
        {
            "role": "system",
            "content": (
                'Generate a short dialogue for shadowing practice. '
                'Return JSON: {"lines":[{"role":"agent"|"user","text":""}]} — at least 4 lines.'
            ),
        },
        {
            "role": "user",
            "content": f"topic: {topic}\nlanguage: {language}\ncefr: {cefr_level or 'B1'}",
        },
    ]
    data = provider.complete_json(messages)
    result: list[DialogueLine] = []
    for line in data.get("lines", []):
        role = line.get("role", "agent")
        if role not in ("agent", "user"):
            role = "agent"
        text = (line.get("text") or "").strip()
        if text:
            result.append(DialogueLine(id=str(uuid.uuid4()), role=role, text=text))
    if len(result) < 4:
        defaults = [
            ("agent", f"Let's talk about {topic}."),
            ("user", "Sure, I'd like that."),
            ("agent", "What interests you most?"),
            ("user", "I want to practice speaking."),
        ]
        result = [
            DialogueLine(id=str(uuid.uuid4()), role=r, text=t) for r, t in defaults
        ]
    return result
