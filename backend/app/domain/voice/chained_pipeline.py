"""Chained voice pipeline: STT text → correction → LLM reply.

Live mode runs correction in parallel (handled in frontend).
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.domain.correction.schemas import CorrectionRequest, CorrectionResponse
from app.domain.correction.service import run_correction
from app.domain.providers.text import TextCompletionProvider
from app.models import User


def chained_user_turn(
    db: Session,
    user: User,
    stt_text: str,
    language: str,
    provider: TextCompletionProvider | None = None,
) -> tuple[CorrectionResponse, str]:
    """Run correction before LLM in chained mode. Returns (correction, agent_reply)."""
    correction = run_correction(
        db,
        user,
        CorrectionRequest(text=stt_text, language=language, mode="auto"),
        provider=provider,
    )
    reply = f'Good point about "{stt_text}". Tell me more.'
    return correction, reply
