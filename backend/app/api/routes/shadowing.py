from typing import Annotated
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.db import get_db
from app.domain.chat.transcript import preview_transcript, snippet_lines
from app.domain.shadowing.service import (
    CreateShadowingRequest,
    PendingLineRequest,
    TurnRequest,
    add_shadowing_pending,
    create_session,
    end_session,
    submit_turn,
)
from app.domain.spend_cap.service import SpendCapExceeded, check_spend_cap
from app.domain.voice.tts_service import synthesize_tts
from app.models import Conversation, ShadowingSession, User

router = APIRouter()


@router.get("/conversations")
def list_conversations(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    language: str | None = None,
) -> dict:
    q = db.query(Conversation).filter(Conversation.user_id == user.id, Conversation.ended_at.isnot(None))
    if language:
        q = q.filter(Conversation.language == language)
    convs = q.order_by(Conversation.started_at.desc()).limit(20).all()
    return {
        "conversations": [
            {
                "id": str(c.id),
                "language": c.language,
                "started_at": c.started_at.isoformat() if c.started_at else None,
                "preview": preview_transcript(c.transcript),
                "snippet_lines": snippet_lines(c.transcript, limit=10),
            }
            for c in convs
        ]
    }


@router.post("/sessions")
def start_session(
    body: CreateShadowingRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    try:
        session = create_session(db, user, body)
    except SpendCapExceeded as exc:
        raise HTTPException(status_code=402, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {
        "session_id": str(session.id),
        "dialogue": session.dialogue,
        "show_text": session.show_text,
        "audio_mode": session.audio_mode,
    }


@router.post("/sessions/{session_id}/turns")
def session_turn(
    session_id: uuid.UUID,
    body: TurnRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    try:
        feedback = submit_turn(db, user, session_id, body)
    except SpendCapExceeded as exc:
        raise HTTPException(status_code=402, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return feedback.model_dump()


@router.post("/sessions/{session_id}/pending")
def session_pending(
    session_id: uuid.UUID,
    body: PendingLineRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    try:
        return add_shadowing_pending(db, user, session_id, body.line_ids)
    except SpendCapExceeded as exc:
        raise HTTPException(status_code=402, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/sessions/{session_id}/end")
def session_end(
    session_id: uuid.UUID,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    try:
        return end_session(db, user, session_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


class TtsRequest(BaseModel):
    line_id: str


@router.post("/sessions/{session_id}/tts")
def session_tts(
    session_id: uuid.UUID,
    body: TtsRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    try:
        check_spend_cap(db, user)
    except SpendCapExceeded as exc:
        raise HTTPException(status_code=402, detail=str(exc)) from exc
    session = db.get(ShadowingSession, session_id)
    if not session or session.user_id != user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    line = next((l for l in (session.dialogue or []) if l.get("id") == body.line_id), None)
    if not line:
        raise HTTPException(status_code=404, detail="Line not found")
    text = str(line.get("text") or "")
    try:
        return synthesize_tts(db, user, text, session.language)
    except SpendCapExceeded as exc:
        raise HTTPException(status_code=402, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"TTS failed: {exc}") from exc
