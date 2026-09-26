import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.domain.plan.generator import generate_plan_grid
from app.domain.providers.text import get_text_provider
from app.domain.skills import skill_level_to_cefr
from app.domain.spend_cap.service import SpendCapExceeded, check_spend_cap, record_usage
from app.models import Lesson, StudyPlan, User, UserLanguageProfile, VocabItem

LESSON_GENERATE_COST = 0.05
VALID_CEFR = {"A1", "A2", "B1", "B2", "C1", "C2"}
VALID_DURATIONS = {4, 8, 12, 16}
DEFAULT_DURATION_WEEKS = 8


def resolve_plan_level(profile: UserLanguageProfile | None) -> str | None:
    """Level used for a one-tap plan: placement CEFR if set, else the median self-assessed skill."""
    if profile is None:
        return None
    if profile.cefr_level in VALID_CEFR:
        return profile.cefr_level
    levels = sorted(
        v
        for v in (
            profile.skill_reading,
            profile.skill_speaking,
            profile.skill_writing,
            profile.skill_listening,
            profile.skill_vocabulary,
        )
        if v is not None
    )
    if not levels:
        return None
    # Lower median: a slightly easier start beats a plan that overwhelms a beginner.
    return skill_level_to_cefr(levels[(len(levels) - 1) // 2])


def get_language_profile(db: Session, user_id: uuid.UUID, language: str) -> UserLanguageProfile | None:
    return (
        db.query(UserLanguageProfile)
        .filter(UserLanguageProfile.user_id == user_id, UserLanguageProfile.language == language)
        .first()
    )


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
        id=uuid.uuid4(),
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
    # Every slot gets a lesson row up front so progress is tracked in the DB; content is generated on first open.
    for week in grid["weeks"]:
        for slot in week["days"]:
            db.add(
                Lesson(
                    study_plan_id=plan.id,
                    title=slot["title"],
                    lesson_type=slot["lesson_type"],
                    content=None,
                    exercises=None,
                    week_index=slot["week"],
                    day_index=slot["day"],
                    is_completed=False,
                )
            )

    profile = get_language_profile(db, user.id, language)
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


LESSON_CONTEXT_BODY_CHARS = 2000


def get_owned_lesson(db: Session, user_id: uuid.UUID, lesson_id: uuid.UUID) -> tuple[Lesson, StudyPlan] | None:
    lesson = db.get(Lesson, lesson_id)
    if lesson is None:
        return None
    plan = db.get(StudyPlan, lesson.study_plan_id)
    if plan is None or plan.user_id != user_id:
        return None
    return lesson, plan


def lesson_chat_context(lesson: Lesson) -> dict[str, Any]:
    """What the tutor needs to practise a plan lesson in Chat."""
    content = lesson.content or {}
    return {
        "id": str(lesson.id),
        "title": lesson.title,
        "lesson_type": lesson.lesson_type,
        "topic": content.get("topic"),
        "week": lesson.week_index,
        "day": lesson.day_index,
        "body": (content.get("body") or "")[:LESSON_CONTEXT_BODY_CHARS],
    }


def list_plan_lessons(db: Session, plan: StudyPlan) -> list[Lesson]:
    return db.query(Lesson).filter(Lesson.study_plan_id == plan.id).order_by(Lesson.day_index).all()


def next_open_day(total_days: int, completed_days: set[int]) -> int:
    """First day not completed yet; total_days + 1 once the whole plan is done."""
    for day in range(1, total_days + 1):
        if day not in completed_days:
            return day
    return total_days + 1


def build_plan_progress(plan: StudyPlan, lessons: list[Lesson]) -> dict[str, Any]:
    grid = plan.generated_plan or {}
    by_day = {lesson.day_index: lesson for lesson in lessons}
    items: list[dict[str, Any]] = []
    weeks: list[dict[str, Any]] = []
    for week in grid.get("weeks", []):
        week_done = 0
        for slot in week.get("days", []):
            lesson = by_day.get(slot["day"])
            done = bool(lesson and lesson.is_completed)
            week_done += done
            items.append(
                {
                    "day": slot["day"],
                    "week": slot["week"],
                    "title": lesson.title if lesson else slot["title"],
                    "lesson_type": slot["lesson_type"],
                    "topic": slot["topic"],
                    "lesson_id": str(lesson.id) if lesson else None,
                    "is_completed": done,
                    "completed_at": lesson.completed_at.isoformat() if lesson and lesson.completed_at else None,
                }
            )
        weeks.append({"week": week["week"], "total": len(week.get("days", [])), "completed": week_done})
    total = len(items)
    completed_days = {i["day"] for i in items if i["is_completed"]}
    return {
        "total_lessons": total,
        "completed_lessons": len(completed_days),
        "percent": round(100 * len(completed_days) / total) if total else 0,
        "next_day": next_open_day(total, completed_days) if total else None,
        "weeks": weeks,
        "lessons": items,
    }


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
    if lesson and lesson.content is not None:
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
    if lesson is None:
        # Plans created before lesson rows were pre-seeded.
        lesson = Lesson(
            study_plan_id=plan.id,
            lesson_type=slot["lesson_type"],
            week_index=slot["week"],
            day_index=day,
            is_completed=False,
        )
        db.add(lesson)
    lesson.title = result.get("title") or slot["title"]
    lesson.content = {"body": result.get("content", ""), "topic": slot["topic"]}
    lesson.exercises = result.get("vocab_candidates", [])
    record_usage(db, user.id, "lesson_generate", LESSON_GENERATE_COST, provider="text")
    db.commit()
    db.refresh(lesson)
    return lesson


def complete_lesson(db: Session, user: User, lesson: Lesson) -> list[VocabItem]:
    if lesson.is_completed:
        return []
    lesson.is_completed = True
    lesson.completed_at = datetime.now(timezone.utc)
    created: list[VocabItem] = []
    plan = db.get(StudyPlan, lesson.study_plan_id)
    if plan:
        completed_days = {
            day
            for (day,) in db.query(Lesson.day_index)
            .filter(Lesson.study_plan_id == plan.id, Lesson.is_completed.is_(True))
            .all()
        }
        completed_days.add(lesson.day_index)
        total_days = (plan.generated_plan or {}).get("total_days", 0)
        plan.progress_day = next_open_day(total_days, completed_days)

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
