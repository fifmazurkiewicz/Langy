import uuid
from types import SimpleNamespace
from unittest.mock import MagicMock

from app.domain.agenda.service import build_agenda, lesson_opening_line
from app.domain.plan.service import LESSON_CONTEXT_BODY_CHARS, get_owned_lesson, lesson_chat_context
from app.domain.voice.live_session import build_live_system_instruction
from app.models import Lesson, StudyPlan


def _lesson(plan_id: uuid.UUID, body: str = "Present simple for routines.") -> Lesson:
    return Lesson(
        id=uuid.uuid4(),
        study_plan_id=plan_id,
        title="Present Simple vs. Present Continuous for Work",
        lesson_type="grammar",
        content={"body": body, "topic": "Work"},
        week_index=1,
        day_index=1,
        is_completed=False,
    )


def _db_with(lesson: Lesson, plan: StudyPlan) -> MagicMock:
    db = MagicMock()
    db.get.side_effect = lambda model, pk: {Lesson: lesson, StudyPlan: plan}[model]
    return db


def test_get_owned_lesson_rejects_other_users_lesson():
    owner = uuid.uuid4()
    plan = StudyPlan(id=uuid.uuid4(), user_id=owner, language="en-GB")
    lesson = _lesson(plan.id)
    db = _db_with(lesson, plan)
    assert get_owned_lesson(db, owner, lesson.id) == (lesson, plan)
    assert get_owned_lesson(db, uuid.uuid4(), lesson.id) is None


def test_lesson_chat_context_truncates_body():
    ctx = lesson_chat_context(_lesson(uuid.uuid4(), body="x" * 5000))
    assert ctx["title"].startswith("Present Simple")
    assert ctx["topic"] == "Work"
    assert len(ctx["body"]) == LESSON_CONTEXT_BODY_CHARS


def test_live_instruction_includes_lesson_material():
    agenda = {
        "language": "en-GB",
        "profile": {},
        "study_plan": {"cefr_level": "A2", "progress_day": 1, "current_topic": "Work"},
        "lesson": lesson_chat_context(_lesson(uuid.uuid4())),
    }
    text = build_live_system_instruction(agenda)
    assert "Present Simple vs. Present Continuous for Work" in text
    assert "Present simple for routines." in text
    assert "topic hint" not in text


def test_live_instruction_without_lesson_keeps_plan_hint():
    agenda = {"language": "en-GB", "profile": {}, "study_plan": {"cefr_level": "A2", "progress_day": 3, "current_topic": "Work"}}
    assert "topic hint: Work" in build_live_system_instruction(agenda)


def test_build_agenda_ignores_lesson_of_other_user():
    plan = StudyPlan(id=uuid.uuid4(), user_id=uuid.uuid4(), language="en-GB")
    lesson = _lesson(plan.id)
    db = _db_with(lesson, plan)
    db.query.return_value.filter.return_value.first.return_value = None
    db.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = []
    db.query.return_value.order_by.return_value.limit.return_value.all.return_value = []
    user = SimpleNamespace(id=uuid.uuid4())
    assert build_agenda(db, user, "en-GB", lesson_id=lesson.id)["lesson"] is None
    user.id = plan.user_id
    assert build_agenda(db, user, "en-GB", lesson_id=lesson.id)["lesson"]["id"] == str(lesson.id)


def test_lesson_opening_line_names_lesson():
    line = lesson_opening_line({"title": "Greetings"})
    assert "Greetings" in line
    assert "?" not in line
