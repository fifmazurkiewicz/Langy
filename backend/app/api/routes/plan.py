import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth.deps import get_approved_user
from app.db import get_db
from app.domain.plan.service import (
    DEFAULT_DURATION_WEEKS,
    build_plan_progress,
    complete_lesson,
    create_study_plan,
    get_active_plan,
    get_language_profile,
    get_or_create_lesson,
    list_plan_lessons,
    resolve_plan_level,
)
from app.domain.spend_cap.service import SpendCapExceeded
from app.models import Lesson, StudyPlan, User

router = APIRouter()


class CreatePlanRequest(BaseModel):
    language: str
    cefr_level: str = Field(pattern=r"^(A1|A2|B1|B2|C1|C2)$")
    duration_weeks: int = Field(ge=4, le=16)


class GeneratePlanRequest(BaseModel):
    language: str | None = None
    duration_weeks: int = Field(DEFAULT_DURATION_WEEKS, ge=4, le=16)


def _plan_payload(db: Session, plan: StudyPlan) -> dict:
    return {
        "id": str(plan.id),
        "language": plan.language,
        "cefr_level": plan.cefr_level,
        "duration_weeks": plan.duration_weeks,
        "days_per_week": plan.days_per_week,
        "progress_day": plan.progress_day,
        "generated_plan": plan.generated_plan,
        "progress": build_plan_progress(plan, list_plan_lessons(db, plan)),
    }


@router.get("")
def get_plan(
    user: Annotated[User, Depends(get_approved_user)],
    db: Annotated[Session, Depends(get_db)],
    language: str | None = None,
) -> dict:
    lang = language or user.active_language
    if not lang:
        return {"plan": None, "suggested_level": None}
    suggested_level = resolve_plan_level(get_language_profile(db, user.id, lang))
    plan = get_active_plan(db, user.id, lang)
    if plan is None:
        return {"plan": None, "suggested_level": suggested_level}
    return {"plan": _plan_payload(db, plan), "suggested_level": suggested_level}


@router.post("")
def create_plan(
    body: CreatePlanRequest,
    user: Annotated[User, Depends(get_approved_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    if body.duration_weeks not in (4, 8, 12, 16):
        raise HTTPException(status_code=400, detail="duration_weeks must be 4, 8, 12, or 16")
    try:
        plan = create_study_plan(db, user, body.language, body.cefr_level, body.duration_weeks)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return _plan_payload(db, plan)


@router.post("/generate")
def generate_plan(
    body: GeneratePlanRequest,
    user: Annotated[User, Depends(get_approved_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    """One-tap plan for learners who don't know where to start: level comes from their language profile."""
    lang = body.language or user.active_language
    if not lang:
        raise HTTPException(status_code=400, detail="No language set")
    if body.duration_weeks not in (4, 8, 12, 16):
        raise HTTPException(status_code=400, detail="duration_weeks must be 4, 8, 12, or 16")
    profile = get_language_profile(db, user.id, lang)
    if profile is None:
        raise HTTPException(status_code=404, detail="Language profile not found")
    level = resolve_plan_level(profile)
    if level is None:
        raise HTTPException(status_code=400, detail="Set your level in Profile first")
    plan = create_study_plan(db, user, lang, level, body.duration_weeks)
    return _plan_payload(db, plan)


@router.get("/lessons/{day}")
def open_lesson(
    day: int,
    user: Annotated[User, Depends(get_approved_user)],
    db: Annotated[Session, Depends(get_db)],
    language: str | None = None,
) -> dict:
    lang = language or user.active_language
    if not lang:
        raise HTTPException(status_code=400, detail="No language set")
    plan = get_active_plan(db, user.id, lang)
    if plan is None:
        raise HTTPException(status_code=404, detail="No active study plan")
    try:
        lesson = get_or_create_lesson(db, user, plan, day)
    except SpendCapExceeded:
        raise HTTPException(status_code=402, detail="Monthly spend cap reached")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {
        "id": str(lesson.id),
        "title": lesson.title,
        "lesson_type": lesson.lesson_type,
        "content": lesson.content,
        "day_index": lesson.day_index,
        "week_index": lesson.week_index,
        "is_completed": lesson.is_completed,
        "completed_at": lesson.completed_at.isoformat() if lesson.completed_at else None,
    }


@router.post("/lessons/{lesson_id}/complete")
def finish_lesson(
    lesson_id: str,
    user: Annotated[User, Depends(get_approved_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    try:
        lesson_uuid = uuid.UUID(lesson_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Lesson not found")
    lesson = db.get(Lesson, lesson_uuid)
    if lesson is None:
        raise HTTPException(status_code=404, detail="Lesson not found")
    plan = db.get(StudyPlan, lesson.study_plan_id)
    if plan is None or plan.user_id != user.id:
        raise HTTPException(status_code=404, detail="Lesson not found")
    already_completed = bool(lesson.is_completed)
    created = complete_lesson(db, user, lesson)
    return {
        "completed": True,
        "already_completed": already_completed,
        "pending_vocab": len(created),
        "progress": build_plan_progress(plan, list_plan_lessons(db, plan)),
    }
