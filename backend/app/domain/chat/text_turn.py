"""Text chat turn when Gemini Live is unavailable (OpenRouter fallback)."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.domain.agenda.service import build_agenda
from app.domain.chat.transcript import parse_transcript
from app.domain.providers.text import TextCompletionProvider
from app.domain.voice.live_session import build_live_system_instruction
from app.models import Conversation, User

_FALLBACK_REPLY = "I'm having trouble responding right now. Could you try again?"


def text_user_turn(
    db: Session,
    user: User,
    conversation: Conversation,
    user_text: str,
    provider: TextCompletionProvider | None = None,
) -> str:
    """Generate a tutor reply from transcript context + agenda."""
    language = conversation.language
    agenda = build_agenda(db, user, language)
    system = (
        build_live_system_instruction(agenda)
        + '\nReply in the learner\'s target language. Return JSON: {"reply": "your message"}'
    )

    messages: list[dict[str, str]] = [{"role": "system", "content": system}]
    lines = parse_transcript(conversation.transcript)
    for line in lines[-20:]:
        role = "user" if line["role"] == "User" else "assistant"
        messages.append({"role": role, "content": line["text"]})

    if not lines or lines[-1]["role"] != "User" or lines[-1]["text"] != user_text:
        messages.append({"role": "user", "content": user_text})

    if provider is None:
        return _FALLBACK_REPLY

    try:
        data = provider.complete_json(messages)
        reply = str(data.get("reply") or "").strip()
        return reply or _FALLBACK_REPLY
    except Exception:
        return _FALLBACK_REPLY
