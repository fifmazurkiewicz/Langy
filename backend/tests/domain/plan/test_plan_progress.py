import uuid
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock

from app.domain.plan.generator import generate_plan_grid
from app.domain.plan.service import (
    build_plan_progress,
    complete_lesson,
    create_study_plan,
    next_open_day,
    resolve_plan_level,
)
from app.models import Lesson, StudyPlan


def _profile(cefr=None, **skills):
    fields = ("reading", "speaking", "writing", "listening", "vocabulary")
    return SimpleNamespace(cefr_level=cefr, **{f"skill_{f}": skills.get(f) for f in fields})


def _plan(weeks=4) -> StudyPlan:
    grid = generate_plan_grid("A2", weeks, "en-GB")
    return StudyPlan(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        language="en-GB",
        cefr_level="A2",
        duration_weeks=weeks,
        days_per_week=grid["days_per_week"],
        progress_day=1,
        generated_plan=grid,
        is_active=True,
    )


def test_resolve_plan_level_prefers_placement_cefr():
    assert resolve_plan_level(_profile("B2", reading=1, speaking=1)) == "B2"


def test_resolve_plan_level_uses_lower_median_of_skills():
    # A2, A2, B1, B2 -> lower median A2
    assert resolve_plan_level(_profile(reading=2, speaking=2, writing=3, listening=4)) == "A2"
    assert resolve_plan_level(_profile(reading=3, speaking=5, writing=4)) == "B2"


def test_resolve_plan_level_unknown_without_level():
    assert resolve_plan_level(None) is None
    assert resolve_plan_level(_profile()) is None


def test_next_open_day_skips_completed():
    assert next_open_day(5, set()) == 1
    assert next_open_day(5, {1, 2, 4}) == 3
    assert next_open_day(3, {1, 2, 3}) == 4


def test_create_study_plan_seeds_lesson_rows():
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = None
    user = SimpleNamespace(id=uuid.uuid4())
    plan = create_study_plan(db, user, "en-GB", "A1", 4)
    added = [c.args[0] for c in db.add.call_args_list]
    lessons = [a for a in added if isinstance(a, Lesson)]
    assert len(lessons) == 20
    assert {lesson.study_plan_id for lesson in lessons} == {plan.id}
    assert sorted(lesson.day_index for lesson in lessons) == list(range(1, 21))
    assert all(lesson.content is None and lesson.is_completed is False for lesson in lessons)


def test_build_plan_progress_counts_completed_lessons():
    plan = _plan(4)
    done_at = datetime(2026, 9, 20, tzinfo=timezone.utc)
    lessons = [
        Lesson(id=uuid.uuid4(), study_plan_id=plan.id, title="t", lesson_type="grammar",
               week_index=1, day_index=d, is_completed=d in (1, 2, 6), completed_at=done_at if d in (1, 2, 6) else None)
        for d in range(1, 21)
    ]
    progress = build_plan_progress(plan, lessons)
    assert progress["total_lessons"] == 20
    assert progress["completed_lessons"] == 3
    assert progress["percent"] == 15
    assert progress["next_day"] == 3
    assert progress["weeks"][0] == {"week": 1, "total": 5, "completed": 2}
    assert progress["weeks"][1] == {"week": 2, "total": 5, "completed": 1}
    assert progress["lessons"][0]["completed_at"] == done_at.isoformat()


def test_build_plan_progress_legacy_plan_without_lesson_rows():
    progress = build_plan_progress(_plan(4), [])
    assert progress["completed_lessons"] == 0
    assert progress["next_day"] == 1
    assert progress["lessons"][0]["lesson_id"] is None


def test_complete_lesson_marks_completed_and_advances_progress():
    plan = _plan(4)
    lesson = Lesson(id=uuid.uuid4(), study_plan_id=plan.id, title="t", lesson_type="grammar",
                    week_index=1, day_index=2, is_completed=False, exercises=[])
    db = MagicMock()
    db.get.return_value = plan
    db.query.return_value.filter.return_value.all.return_value = [(1,)]
    complete_lesson(db, SimpleNamespace(id=plan.user_id), lesson)
    assert lesson.is_completed is True
    assert lesson.completed_at is not None
    assert plan.progress_day == 3
    db.commit.assert_called_once()


def test_complete_lesson_is_idempotent():
    stamp = datetime(2026, 9, 1, tzinfo=timezone.utc)
    lesson = Lesson(id=uuid.uuid4(), study_plan_id=uuid.uuid4(), title="t", lesson_type="grammar",
                    week_index=1, day_index=1, is_completed=True, completed_at=stamp,
                    exercises=[{"term": "hello"}])
    db = MagicMock()
    assert complete_lesson(db, SimpleNamespace(id=uuid.uuid4()), lesson) == []
    assert lesson.completed_at == stamp
    db.commit.assert_not_called()
