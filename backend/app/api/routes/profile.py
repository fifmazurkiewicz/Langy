from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.db import get_db
from app.domain.languages import SUPPORTED_LANGUAGES
from app.domain.profile.service import ensure_flashcard_sets_for_interests, enqueue_jobs_for_new_interest_sets
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


class AddLanguageRequest(BaseModel):
    language: str
    motivations: list[str] = Field(default_factory=list)
    interests: list[str] = Field(default_factory=list)
    skill_reading: int = Field(2, ge=1, le=5)
    skill_speaking: int = Field(2, ge=1, le=5)
    skill_writing: int = Field(2, ge=1, le=5)
    skill_listening: int = Field(2, ge=1, le=5)
    skill_vocabulary: int = Field(2, ge=1, le=5)
    set_active: bool = False


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


@router.post("/languages")
def add_language(
    body: AddLanguageRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    if body.language not in SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=400, detail=f"Unsupported language: {body.language}")
    existing = (
        db.query(UserLanguageProfile)
        .filter(UserLanguageProfile.user_id == user.id, UserLanguageProfile.language == body.language)
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Language already added")

    profile = UserLanguageProfile(
        user_id=user.id,
        language=body.language,
        motivations=body.motivations or ["fun"],
        interests=body.interests or [],
        skill_reading=body.skill_reading,
        skill_speaking=body.skill_speaking,
        skill_writing=body.skill_writing,
        skill_listening=body.skill_listening,
        skill_vocabulary=body.skill_vocabulary,
        assessed_at=datetime.now(timezone.utc),
    )
    db.add(profile)
    if body.set_active:
        user.active_language = body.language
    db.flush()
    new_keys = ensure_flashcard_sets_for_interests(db, user.id, body.language, body.interests)
    db.commit()
    if new_keys:
        enqueue_jobs_for_new_interest_sets(db, user.id, body.language, new_keys)
    return {"ok": True, "language": body.language, "active_language": user.active_language}


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
    new_keys: list[str] = []
    if body.motivations is not None:
        profile.motivations = body.motivations
    if body.interests is not None:
        old_interests = set(profile.interests or [])
        profile.interests = body.interests
        new_interest_items = [i for i in body.interests if i not in old_interests]
        new_keys = ensure_flashcard_sets_for_interests(db, user.id, language, new_interest_items)
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
    if new_keys:
        enqueue_jobs_for_new_interest_sets(db, user.id, language, new_keys)
    return {"ok": True, "new_categories": new_keys}
