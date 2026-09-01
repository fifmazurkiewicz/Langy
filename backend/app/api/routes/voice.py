from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.db import get_db
from app.domain.spend_cap.service import SpendCapExceeded
from app.domain.voice.catalog import voice_catalog_payload
from app.domain.voice.tts_service import synthesize_tts, voice_public_config
from app.models import User

router = APIRouter()


class SynthesizeRequest(BaseModel):
    text: str
    language: str | None = None
    voice_key: str | None = None
    custom_voice_id: str | None = None


@router.get("/config")
def get_voice_config(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    language: str | None = Query(None),
) -> dict:
    try:
        from app.domain.spend_cap.service import check_spend_cap

        check_spend_cap(db, user)
    except SpendCapExceeded as exc:
        raise HTTPException(status_code=402, detail=str(exc)) from exc
    lang = language or user.active_language
    if not lang:
        raise HTTPException(status_code=400, detail="No active language")
    return voice_public_config(db, user, lang)


@router.get("/catalog")
def get_voice_catalog(
    user: Annotated[User, Depends(get_current_user)],
    language: str = Query(...),
) -> dict:
    return voice_catalog_payload(language)


@router.post("/synthesize")
def synthesize_voice(
    body: SynthesizeRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    language = body.language or user.active_language
    if not language:
        raise HTTPException(status_code=400, detail="No active language")
    try:
        return synthesize_tts(
            db,
            user,
            body.text,
            language,
            voice_key_override=body.voice_key,
            custom_voice_id_override=body.custom_voice_id,
        )
    except SpendCapExceeded as exc:
        raise HTTPException(status_code=402, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"TTS failed: {exc}") from exc
