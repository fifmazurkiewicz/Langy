from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.db import get_db
from app.domain.category.service import enqueue_category_jobs_for_user, process_category_job
from app.domain.languages import SUPPORTED_LANGUAGES
from app.domain.plan.service import create_study_plan
from app.domain.profile.service import ensure_flashcard_sets_for_interests
from app.models import User, UserLanguageProfile

router = APIRouter()


class LanguageProfileInput(BaseModel):
    language: str
    motivations: list[str] | None = None
    interests: list[str] | None = None
    skill_reading: int | None = Field(None, ge=1, le=6)
    skill_speaking: int | None = Field(None, ge=1, le=6)
    skill_writing: int | None = Field(None, ge=1, le=6)
    skill_listening: int | None = Field(None, ge=1, le=6)
    skill_vocabulary: int | None = Field(None, ge=1, le=6)
    cefr_level: str | None = None
    plan_duration_weeks: int | None = Field(None, ge=4, le=16)


class CompleteOnboardingRequest(BaseModel):
    languages: list[str]
    profiles: list[LanguageProfileInput]
    active_language: str


@router.post("/complete")
def complete_onboarding(
    body: CompleteOnboardingRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    if not body.languages:
        raise HTTPException(status_code=400, detail="At least one language required")
    for lang in body.languages:
        if lang not in SUPPORTED_LANGUAGES:
            raise HTTPException(status_code=400, detail=f"Unsupported language: {lang}")
    if body.active_language not in body.languages:
        raise HTTPException(status_code=400, detail="active_language must be in languages")

    for profile_in in body.profiles:
        if profile_in.language not in body.languages:
            continue
        profile = (
            db.query(UserLanguageProfile)
            .filter(UserLanguageProfile.user_id == user.id, UserLanguageProfile.language == profile_in.language)
            .first()
        )
        if profile is None:
            profile = UserLanguageProfile(user_id=user.id, language=profile_in.language)
            db.add(profile)
        profile.motivations = profile_in.motivations
        profile.interests = profile_in.interests
        profile.skill_reading = profile_in.skill_reading
        profile.skill_speaking = profile_in.skill_speaking
        profile.skill_writing = profile_in.skill_writing
        profile.skill_listening = profile_in.skill_listening
        profile.skill_vocabulary = profile_in.skill_vocabulary
        profile.cefr_level = profile_in.cefr_level
        profile.assessed_at = datetime.now(timezone.utc)

        new_keys = ensure_flashcard_sets_for_interests(
            db, user.id, profile_in.language, profile_in.interests
        )
        if new_keys:
            db.flush()

    user.active_language = body.active_language
    user.onboarding_completed_at = datetime.now(timezone.utc)
    db.commit()

    for profile_in in body.profiles:
        if profile_in.language not in body.languages:
            continue
        if profile_in.cefr_level and profile_in.plan_duration_weeks in (4, 8, 12, 16):
            create_study_plan(
                db, user, profile_in.language, profile_in.cefr_level, profile_in.plan_duration_weeks
            )
        jobs = enqueue_category_jobs_for_user(db, user.id, profile_in.language)
        for job in jobs:
            process_category_job(db, job)

    return {"ok": True, "active_language": user.active_language}


@router.get("/status")
def onboarding_status(
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    return {
        "completed": user.onboarding_completed_at is not None,
        "active_language": user.active_language,
    }
