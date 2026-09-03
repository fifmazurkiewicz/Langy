"""Parse and format conversation transcripts stored as plain text."""

from __future__ import annotations

from typing import Literal

TranscriptRole = Literal["User", "Agent"]


def parse_transcript(transcript: str | None) -> list[dict[str, str]]:
    lines: list[dict[str, str]] = []
    for raw in (transcript or "").splitlines():
        line = raw.strip()
        if not line:
            continue
        if line.startswith("User: "):
            lines.append({"role": "User", "text": line[6:].strip()})
        elif line.startswith("Agent: "):
            lines.append({"role": "Agent", "text": line[7:].strip()})
        else:
            lines.append({"role": "Agent", "text": line})
    return lines


def preview_transcript(transcript: str | None, limit: int = 120) -> str:
    text = (transcript or "").replace("\n", " ").strip()
    if len(text) <= limit:
        return text
    return text[: limit - 1].rstrip() + "…"


def snippet_lines(transcript: str | None, limit: int = 10) -> list[dict[str, str]]:
    """Return the last `limit` parsed transcript lines for list previews."""
    if limit <= 0:
        return []
    lines = parse_transcript(transcript)
    if len(lines) <= limit:
        return lines
    return lines[-limit:]
