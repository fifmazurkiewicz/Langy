from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.domain.providers.text import TextCompletionProvider, get_text_provider
from app.domain.shadowing.dialogue import DialogueLine, generate_dialogue, lines_from_conversation_transcript
from app.domain.spend_cap.service import SpendCapExceeded, check_spend_cap, record_usage
from app.models import Conversation, ShadowingSession, User, VocabItem

SHADOWING_START_COST = 0.01
TURN_FEEDBACK_COST = 0.002


class CreateShadowingRequest(BaseModel):
    language: str = Field(min_length=2)
    topic: str | None = None
    conversation_id: uuid.UUID | None = None
    show_text: bool = True
    audio_mode: Literal["tts", "live"] = "tts"


class TurnRequest(BaseModel):
    line_id: str
    user_transcript: str


class TurnFeedback(BaseModel):
    ok: bool
    corrected_text: str | None = None
    explanation_pl: str | None = None
    mark_hard: bool = False


class PendingLineRequest(BaseModel):
    line_ids: list[str] = Field(default_factory=list)


def create_session(
    db: Session,
    user: User,
    req: CreateShadowingRequest,
    provider: TextCompletionProvider | None = None,
) -> ShadowingSession:
    check_spend_cap(db, user)
    provider = provider or get_text_provider()
    if req.conversation_id:
        conv = db.get(Conversation, req.conversation_id)
        if not conv or conv.user_id != user.id:
            raise ValueError("Conversation not found")
        dialogue = lines_from_conversation_transcript(conv.transcript or "")
        source = "conversation"
        topic = req.topic
    else:
        if not req.topic:
            raise ValueError("topic required for generated dialogue")
        dialogue = generate_dialogue(provider, topic=req.topic, language=req.language)
        source = "generated"
        topic = req.topic
        record_usage(db, user.id, "gen_ai", SHADOWING_START_COST, provider="shadowing_dialogue_generate")

    session = ShadowingSession(
        user_id=user.id,
        language=req.language,
        topic=topic,
        source=source,
        conversation_id=req.conversation_id,
        dialogue=[line.model_dump() for line in dialogue],
        show_text=req.show_text,
        audio_mode=req.audio_mode,
        hard_line_ids=[],
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def submit_turn(
    db: Session,
    user: User,
    session_id: uuid.UUID,
    req: TurnRequest,
    provider: TextCompletionProvider | None = None,
) -> TurnFeedback:
    check_spend_cap(db, user)
    provider = provider or get_text_provider()
    session = db.get(ShadowingSession, session_id)
    if not session or session.user_id != user.id or session.ended_at:
        raise ValueError("Session not found")
    lines = session.dialogue or []
    line = next((l for l in lines if l.get("id") == req.line_id), None)
    if not line:
        raise ValueError("Line not found")
    messages = [
        {
            "role": "system",
            "content": (
                'Compare learner repeat to model line. Return JSON: '
                '{"ok":bool,"corrected_text":"","explanation_pl":"","mark_hard":bool}'
            ),
        },
        {
            "role": "user",
            "content": f"model: {line['text']}\nlearner: {req.user_transcript}",
        },
    ]
    data = provider.complete_json(messages)
    record_usage(db, user.id, "gen_ai", TURN_FEEDBACK_COST, provider="shadowing_turn_feedback")
    mark_hard = bool(data.get("mark_hard"))
    if mark_hard:
        hard = list(session.hard_line_ids or [])
        if req.line_id not in hard:
            hard.append(req.line_id)
            session.hard_line_ids = hard
            db.commit()
    return TurnFeedback(
        ok=bool(data.get("ok")),
        corrected_text=data.get("corrected_text"),
        explanation_pl=data.get("explanation_pl"),
        mark_hard=mark_hard,
    )


def add_shadowing_pending(
    db: Session,
    user: User,
    session_id: uuid.UUID,
    line_ids: list[str],
) -> dict:
    check_spend_cap(db, user)
    session = db.get(ShadowingSession, session_id)
    if not session or session.user_id != user.id:
        raise ValueError("Session not found")
    created = 0
    for line_id in line_ids:
        line = next((l for l in (session.dialogue or []) if l.get("id") == line_id), None)
        if not line:
            continue
        term = line["text"]
        existing = (
            db.query(VocabItem)
            .filter(VocabItem.user_id == user.id, VocabItem.language == session.language, VocabItem.term == term)
            .first()
        )
        if existing and existing.status in ("accepted", "pending"):
            continue
        if existing and existing.status == "rejected":
            existing.status = "pending"
            existing.source = "shadowing"
            db.commit()
            created += 1
            continue
        if existing:
            continue
        db.add(
            VocabItem(
                user_id=user.id,
                language=session.language,
                term=term,
                translation=term,
                context_sentence=f"Shadowing: {session.topic or 'conversation'}",
                source="shadowing",
                status="pending",
            )
        )
        created += 1
    db.commit()
    return {"created": created}


def end_session(db: Session, user: User, session_id: uuid.UUID) -> dict:
    session = db.get(ShadowingSession, session_id)
    if not session or session.user_id != user.id:
        raise ValueError("Session not found")
    session.ended_at = datetime.now(timezone.utc)
    db.commit()
    hard_ids = session.hard_line_ids or []
    if hard_ids:
        return add_shadowing_pending(db, user, session_id, hard_ids)
    return {"created": 0}
