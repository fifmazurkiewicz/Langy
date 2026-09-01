import random
import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.config import get_settings
from app.db import get_db
from app.domain.agenda.service import (
    OPENING_LINES,
    RESUME_LINES,
    agent_save_word,
    append_transcript_line,
    build_agenda,
    enqueue_post_session_jobs,
    process_post_session_job,
)
from app.domain.chat.service import ConversationDeleteError, delete_conversation
from app.domain.chat.text_turn import text_user_turn
from app.domain.chat.transcript import parse_transcript, preview_transcript
from app.domain.spend_cap.service import SpendCapExceeded, check_spend_cap, record_usage
from app.domain.providers.text import get_text_provider
from app.domain.voice.chained_pipeline import chained_user_turn
from app.domain.voice.live_session import build_live_system_instruction
from app.domain.voice.live_token import LiveTokenError, mint_ephemeral_live_token
from app.models import Conversation, ConversationSummary, Job, User

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


class ChainedTurnRequest(BaseModel):
    text: str
    language: str | None = None


class TextTurnRequest(BaseModel):
    text: str
    language: str | None = None
    conversation_id: str | None = None


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


@router.get("/conversations")
def list_conversations(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    language: str | None = Query(default=None),
) -> dict:
    q = db.query(Conversation).filter(Conversation.user_id == user.id)
    if language:
        q = q.filter(Conversation.language == language)
    convs = q.order_by(Conversation.started_at.desc()).limit(20).all()
    conv_ids = [c.id for c in convs]
    summaries: dict[uuid.UUID, str] = {}
    if conv_ids:
        rows = (
            db.query(ConversationSummary)
            .filter(ConversationSummary.conversation_id.in_(conv_ids))
            .all()
        )
        for row in rows:
            summaries[row.conversation_id] = row.summary
    return {
        "conversations": [
            {
                "id": str(c.id),
                "language": c.language,
                "started_at": c.started_at.isoformat() if c.started_at else None,
                "ended_at": c.ended_at.isoformat() if c.ended_at else None,
                "preview": preview_transcript(c.transcript),
                "summary": summaries.get(c.id),
                "is_active": c.ended_at is None,
            }
            for c in convs
        ]
    }


@router.delete("/conversations/{conversation_id}")
def remove_conversation(
    conversation_id: uuid.UUID,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    try:
        delete_conversation(db, user, conversation_id)
    except ConversationDeleteError as exc:
        message = str(exc)
        status = 404 if message == "Session not found" else 400
        raise HTTPException(status_code=status, detail=message) from exc
    return {"ok": True}


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
        "lines": parse_transcript(conversation.transcript),
        "ended": conversation.ended_at is not None,
        "started_at": conversation.started_at.isoformat() if conversation.started_at else None,
        "ended_at": conversation.ended_at.isoformat() if conversation.ended_at else None,
    }


@router.post("/sessions/{conversation_id}/resume")
def resume_session(
    conversation_id: uuid.UUID,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    try:
        check_spend_cap(db, user)
    except SpendCapExceeded as exc:
        raise HTTPException(status_code=402, detail=str(exc)) from exc

    conversation = db.get(Conversation, conversation_id)
    if not conversation or conversation.user_id != user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    if conversation.ended_at is None:
        raise HTTPException(status_code=400, detail="Session still active")

    conversation.ended_at = None
    welcome = random.choice(RESUME_LINES)
    append_transcript_line(conversation, "Agent", welcome)
    db.commit()

    lines = parse_transcript(conversation.transcript)
    return {
        "conversation_id": str(conversation.id),
        "language": conversation.language,
        "lines": lines,
        "opening_line": welcome,
        "resumed": True,
        "voice_mode": settings.voice_mode,
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


@router.post("/text-turn")
def text_turn(
    body: TextTurnRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    """OpenRouter text reply when Live is not connected (any VOICE_MODE)."""
    try:
        check_spend_cap(db, user)
    except SpendCapExceeded as exc:
        raise HTTPException(status_code=402, detail=str(exc)) from exc

    if not body.conversation_id:
        raise HTTPException(status_code=400, detail="conversation_id required")

    try:
        conversation_id = uuid.UUID(body.conversation_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid conversation_id") from exc

    conversation = db.get(Conversation, conversation_id)
    if not conversation or conversation.user_id != user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    if conversation.ended_at:
        raise HTTPException(status_code=400, detail="Session ended")

    language = body.language or user.active_language
    if language and conversation.language != language:
        raise HTTPException(status_code=400, detail="Language mismatch")

    reply = text_user_turn(db, user, conversation, body.text, provider=get_text_provider())
    record_usage(db, user.id, "gen_ai", 0.002, provider="text_turn")
    return {"agent_reply": reply}


@router.post("/chained-turn")
def chained_turn(
    body: ChainedTurnRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    if settings.voice_mode != "chained":
        raise HTTPException(status_code=400, detail="Chained turn only when VOICE_MODE=chained")
    try:
        check_spend_cap(db, user)
    except SpendCapExceeded as exc:
        raise HTTPException(status_code=402, detail=str(exc)) from exc
    language = body.language or user.active_language
    if not language:
        raise HTTPException(status_code=400, detail="No active language")
    correction, reply = chained_user_turn(db, user, body.text, language, provider=get_text_provider())
    record_usage(db, user.id, "gen_ai", 0.002, provider="chained_turn")
    return {"correction": correction.model_dump(), "agent_reply": reply}


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
