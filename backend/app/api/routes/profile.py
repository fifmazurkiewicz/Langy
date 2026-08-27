from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.db import get_db
from app.models import User, UserLanguageProfile

router = APIRouter()


class ProfileUpdate(BaseModel):
    motivations: list[str] | None = None
    interests: list[str] | None = None
    skill_reading: int | None = Field(None, ge=1, le=5)
    skill_speaking: int | None = Field(None, ge=1, le=5)
    skill_writing: int | None = Field(None, ge=1, le=5)
    skill_listening: int | None = Field(None, ge=1, le=5)
    skill_vocabulary: int | None = Field(None, ge=1, le=5)


class ActiveLanguageUpdate(BaseModel):
    active_language: str


@router.get("/languages")
def list_profiles(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    profiles = db.query(UserLanguageProfile).filter(UserLanguageProfile.user_id == user.id).all()
    return {
        "active_language": user.active_language,
        "profiles": [
            {
                "language": p.language,
                "motivations": p.motivations or [],
                "interests": p.interests or [],
                "skills": {
                    "reading": p.skill_reading,
                    "speaking": p.skill_speaking,
                    "writing": p.skill_writing,
                    "listening": p.skill_listening,
                    "vocabulary": p.skill_vocabulary,
                },
                "cefr_level": p.cefr_level,
            }
            for p in profiles
        ],
    }


@router.patch("/active-language")
def set_active_language(
    body: ActiveLanguageUpdate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    profile = (
        db.query(UserLanguageProfile)
        .filter(UserLanguageProfile.user_id == user.id, UserLanguageProfile.language == body.active_language)
        .first()
    )
    if profile is None:
        raise HTTPException(status_code=404, detail="Language profile not found")
    user.active_language = body.active_language
    db.commit()
    return {"active_language": user.active_language}


@router.patch("/{language}")
def update_profile(
    language: str,
    body: ProfileUpdate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    profile = (
        db.query(UserLanguageProfile)
        .filter(UserLanguageProfile.user_id == user.id, UserLanguageProfile.language == language)
        .first()
    )
    if profile is None:
        raise HTTPException(status_code=404, detail="Language profile not found")
    if body.motivations is not None:
        profile.motivations = body.motivations
    if body.interests is not None:
        profile.interests = body.interests
    if body.skill_reading is not None:
        profile.skill_reading = body.skill_reading
    if body.skill_speaking is not None:
        profile.skill_speaking = body.skill_speaking
    if body.skill_writing is not None:
        profile.skill_writing = body.skill_writing
    if body.skill_listening is not None:
        profile.skill_listening = body.skill_listening
    if body.skill_vocabulary is not None:
        profile.skill_vocabulary = body.skill_vocabulary
    db.commit()
    return {"ok": True}
