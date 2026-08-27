import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.domain.plan.generator import generate_plan_grid
from app.domain.providers.text import TextCompletionProvider, get_text_provider
from app.domain.spend_cap.service import SpendCapExceeded, check_spend_cap, record_usage
from app.models import Lesson, StudyPlan, User, UserLanguageProfile, VocabItem

LESSON_GENERATE_COST = 0.05
VALID_CEFR = {"A1", "A2", "B1", "B2", "C1", "C2"}
VALID_DURATIONS = {4, 8, 12, 16}


def create_study_plan(
    db: Session,
    user: User,
    language: str,
    cefr_level: str,
    duration_weeks: int,
) -> StudyPlan:
    if cefr_level not in VALID_CEFR:
        raise ValueError("Invalid CEFR level")
    if duration_weeks not in VALID_DURATIONS:
        raise ValueError("Invalid duration")

    existing = (
        db.query(StudyPlan)
        .filter(StudyPlan.user_id == user.id, StudyPlan.language == language, StudyPlan.is_active.is_(True))
        .first()
    )
    if existing:
        existing.is_active = False

    grid = generate_plan_grid(cefr_level, duration_weeks, language)
    plan = StudyPlan(
        user_id=user.id,
        language=language,
        cefr_level=cefr_level,
        duration_weeks=duration_weeks,
        days_per_week=grid["days_per_week"],
        progress_day=1,
        generated_plan=grid,
        is_active=True,
    )
    db.add(plan)

    profile = (
        db.query(UserLanguageProfile)
        .filter(UserLanguageProfile.user_id == user.id, UserLanguageProfile.language == language)
        .first()
    )
    if profile:
        profile.cefr_level = cefr_level
        profile.assessed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(plan)
    return plan


def get_active_plan(db: Session, user_id: uuid.UUID, language: str) -> StudyPlan | None:
    return (
        db.query(StudyPlan)
        .filter(StudyPlan.user_id == user_id, StudyPlan.language == language, StudyPlan.is_active.is_(True))
        .first()
    )


def get_day_slot(plan: StudyPlan, day: int) -> dict[str, Any] | None:
    grid = plan.generated_plan or {}
    for week in grid.get("weeks", []):
        for slot in week.get("days", []):
            if slot.get("day") == day:
                return slot
    return None


def get_or_create_lesson(db: Session, user: User, plan: StudyPlan, day: int) -> Lesson:
    lesson = (
        db.query(Lesson)
        .filter(Lesson.study_plan_id == plan.id, Lesson.day_index == day)
        .first()
    )
    if lesson:
        return lesson

    slot = get_day_slot(plan, day)
    if slot is None:
        raise ValueError("Invalid day index")

    check_spend_cap(db, user, LESSON_GENERATE_COST)
    provider = get_text_provider()
    prompt = [
        {
            "role": "system",
            "content": (
                "Create a short language lesson. Return JSON: "
                '{"title":"","content":"","vocab_candidates":[{"term":"","translation_pl":"","context":""}]}'
            ),
        },
        {
            "role": "user",
            "content": (
                f"Language: {plan.language}\nCEFR: {plan.cefr_level}\n"
                f"Type: {slot['lesson_type']}\nTopic: {slot['topic']}"
            ),
        },
    ]
    result = provider.complete_json(prompt)
    lesson = Lesson(
        study_plan_id=plan.id,
        title=result.get("title") or slot["title"],
        lesson_type=slot["lesson_type"],
        content={"body": result.get("content", ""), "topic": slot["topic"]},
        exercises=result.get("vocab_candidates", []),
        week_index=slot["week"],
        day_index=day,
        is_completed=False,
    )
    db.add(lesson)
    record_usage(db, user.id, "lesson_generate", LESSON_GENERATE_COST, provider="text")
    db.commit()
    db.refresh(lesson)
    return lesson


def complete_lesson(db: Session, user: User, lesson: Lesson) -> list[VocabItem]:
    lesson.is_completed = True
    created: list[VocabItem] = []
    plan = db.get(StudyPlan, lesson.study_plan_id)
    if plan and lesson.day_index >= plan.progress_day:
        plan.progress_day = lesson.day_index + 1

    for c in lesson.exercises or []:
        term = (c.get("term") or "").strip()
        if not term:
            continue
        existing = (
            db.query(VocabItem)
            .filter(
                VocabItem.user_id == user.id,
                VocabItem.language == plan.language if plan else "",
                VocabItem.term == term,
            )
            .first()
        )
        if existing:
            if existing.status == "rejected":
                existing.status = "pending"
                existing.translation = c.get("translation_pl") or existing.translation
                existing.context_sentence = c.get("context")
                existing.source = "lesson"
                created.append(existing)
            continue
        if plan is None:
            continue
        item = VocabItem(
            user_id=user.id,
            language=plan.language,
            term=term,
            translation=c.get("translation_pl") or "",
            context_sentence=c.get("context"),
            source="lesson",
            status="pending",
        )
        db.add(item)
        created.append(item)

    db.commit()
    return created
