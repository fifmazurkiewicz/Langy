import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.db import get_db
from app.domain.plan.service import (
    complete_lesson,
    create_study_plan,
    get_active_plan,
    get_or_create_lesson,
)
from app.domain.spend_cap.service import SpendCapExceeded
from app.models import Lesson, StudyPlan, User

router = APIRouter()


class CreatePlanRequest(BaseModel):
    language: str
    cefr_level: str = Field(pattern=r"^(A1|A2|B1|B2|C1|C2)$")
    duration_weeks: int = Field(ge=4, le=16)


@router.get("")
def get_plan(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    language: str | None = None,
) -> dict:
    lang = language or user.active_language
    if not lang:
        return {"plan": None}
    plan = get_active_plan(db, user.id, lang)
    if plan is None:
        return {"plan": None}
    return {
        "plan": {
            "id": str(plan.id),
            "language": plan.language,
            "cefr_level": plan.cefr_level,
            "duration_weeks": plan.duration_weeks,
            "days_per_week": plan.days_per_week,
            "progress_day": plan.progress_day,
            "generated_plan": plan.generated_plan,
        }
    }


@router.post("")
def create_plan(
    body: CreatePlanRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    if body.duration_weeks not in (4, 8, 12, 16):
        raise HTTPException(status_code=400, detail="duration_weeks must be 4, 8, 12, or 16")
    try:
        plan = create_study_plan(db, user, body.language, body.cefr_level, body.duration_weeks)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {
        "id": str(plan.id),
        "cefr_level": plan.cefr_level,
        "duration_weeks": plan.duration_weeks,
        "progress_day": plan.progress_day,
        "generated_plan": plan.generated_plan,
    }


@router.get("/lessons/{day}")
def open_lesson(
    day: int,
    user: Annotated[User, Depends(get_current_user)],
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
    }


@router.post("/lessons/{lesson_id}/complete")
def finish_lesson(
    lesson_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    lesson = db.get(Lesson, uuid.UUID(lesson_id))
    if lesson is None:
        raise HTTPException(status_code=404, detail="Lesson not found")
    plan = db.get(StudyPlan, lesson.study_plan_id)
    if plan is None or plan.user_id != user.id:
        raise HTTPException(status_code=404, detail="Lesson not found")
    created = complete_lesson(db, user, lesson)
    return {"completed": True, "pending_vocab": len(created)}
