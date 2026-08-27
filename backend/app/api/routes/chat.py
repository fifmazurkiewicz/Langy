import random
import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.config import get_settings
from app.db import get_db
from app.domain.agenda.service import (
    OPENING_LINES,
    agent_save_word,
    append_transcript_line,
    build_agenda,
    enqueue_post_session_jobs,
    process_post_session_job,
)
from app.domain.spend_cap.service import SpendCapExceeded, check_spend_cap, record_usage
from app.domain.voice.live_session import build_live_system_instruction
from app.domain.voice.live_token import LiveTokenError, mint_ephemeral_live_token
from app.models import Conversation, Job, User

router = APIRouter()
settings = get_settings()


class StartSessionRequest(BaseModel):
    language: str | None = None


class TranscriptLineRequest(BaseModel):
    role: str
    text: str


class SaveWordRequest(BaseModel):
    term: str
    translation: str
    context: str | None = None


@router.post("/sessions")
def start_session(
    body: StartSessionRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    try:
        check_spend_cap(db, user)
    except SpendCapExceeded as exc:
        raise HTTPException(status_code=402, detail=str(exc)) from exc

    language = body.language or user.active_language
    if not language:
        raise HTTPException(status_code=400, detail="No active language")

    conversation = Conversation(user_id=user.id, language=language, transcript="")
    db.add(conversation)
    db.commit()
    db.refresh(conversation)

    agenda = build_agenda(db, user, language)
    opening = random.choice(OPENING_LINES)
    append_transcript_line(conversation, "Agent", opening)
    db.commit()

    return {
        "conversation_id": str(conversation.id),
        "language": language,
        "opening_line": opening,
        "agenda": agenda,
        "voice_mode": settings.voice_mode,
    }


@router.get("/sessions/{conversation_id}")
def get_session(
    conversation_id: uuid.UUID,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    conversation = db.get(Conversation, conversation_id)
    if not conversation or conversation.user_id != user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "conversation_id": str(conversation.id),
        "language": conversation.language,
        "transcript": conversation.transcript,
        "ended": conversation.ended_at is not None,
    }


@router.post("/sessions/{conversation_id}/lines")
def append_line(
    conversation_id: uuid.UUID,
    body: TranscriptLineRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    conversation = db.get(Conversation, conversation_id)
    if not conversation or conversation.user_id != user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    if conversation.ended_at:
        raise HTTPException(status_code=400, detail="Session ended")
    if body.role not in ("User", "Agent"):
        raise HTTPException(status_code=400, detail="role must be User or Agent")
    transcript = append_transcript_line(conversation, body.role, body.text)
    db.commit()
    return {"transcript": transcript}


@router.post("/sessions/{conversation_id}/end")
def end_session(
    conversation_id: uuid.UUID,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    conversation = db.get(Conversation, conversation_id)
    if not conversation or conversation.user_id != user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    if conversation.ended_at:
        return {"ok": True, "job_id": None}

    conversation.ended_at = datetime.now(timezone.utc)
    db.commit()
    job = enqueue_post_session_jobs(db, conversation.id, user.id)
    process_post_session_job(db, job)
    return {"ok": True, "job_id": str(job.id)}


@router.post("/sessions/{conversation_id}/save-word")
def save_word(
    conversation_id: uuid.UUID,
    body: SaveWordRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    conversation = db.get(Conversation, conversation_id)
    if not conversation or conversation.user_id != user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    item = agent_save_word(db, user, conversation.language, body.term, body.translation, body.context)
    record_usage(db, user.id, "gen_ai", 0.001, provider="agent_save")
    return {"vocab_id": str(item.id), "status": item.status}


class LiveTokenRequest(BaseModel):
    language: str | None = None
    conversation_id: str | None = None


@router.post("/live-token")
def create_live_token(
    body: LiveTokenRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    if settings.voice_mode != "speech_to_speech":
        raise HTTPException(status_code=400, detail="Live tokens only for speech_to_speech mode")
    try:
        check_spend_cap(db, user)
    except SpendCapExceeded as exc:
        raise HTTPException(status_code=402, detail=str(exc)) from exc

    language = body.language or user.active_language
    if not language:
        raise HTTPException(status_code=400, detail="No active language")

    agenda = build_agenda(db, user, language)
    system_instruction = build_live_system_instruction(agenda)

    if not settings.google_api_key:
        return {
            "mode": "mock",
            "token": None,
            "model": "gemini-2.0-flash-live-001",
            "api_version": "v1alpha",
            "system_instruction": system_instruction,
            "configured": False,
        }

    try:
        token_data = mint_ephemeral_live_token(system_instruction=system_instruction)
    except LiveTokenError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return {
        "mode": "live",
        "configured": True,
        "system_instruction": system_instruction,
        **token_data,
    }


@router.get("/live-config")
def live_config(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    try:
        check_spend_cap(db, user)
    except SpendCapExceeded as exc:
        raise HTTPException(status_code=402, detail=str(exc)) from exc

    return {
        "mode": "speech_to_speech" if settings.google_api_key else "mock",
        "model": "gemini-2.0-flash-live-001",
        "configured": bool(settings.google_api_key),
        "voice_mode": settings.voice_mode,
    }


@router.post("/jobs/process-pending")
def process_pending_jobs(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin only")
    jobs = db.query(Job).filter(Job.status == "pending").limit(10).all()
    for job in jobs:
        if job.job_type == "post_session":
            process_post_session_job(db, job)
    return {"processed": len(jobs)}
