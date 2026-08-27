import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class StudyPlan(Base):
    __tablename__ = "study_plans"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    language: Mapped[str] = mapped_column(String, nullable=False)
    cefr_level: Mapped[str] = mapped_column(String, nullable=False)
    duration_weeks: Mapped[int] = mapped_column(Integer, nullable=False)
    days_per_week: Mapped[int] = mapped_column(Integer, nullable=False)
    progress_day: Mapped[int] = mapped_column(Integer, default=1)
    generated_plan: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    lessons: Mapped[list["Lesson"]] = relationship(back_populates="study_plan")


class Lesson(Base):
    __tablename__ = "lessons"
    __table_args__ = (UniqueConstraint("study_plan_id", "day_index", name="uq_lesson_day"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    study_plan_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("study_plans.id"), nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    lesson_type: Mapped[str] = mapped_column(String, nullable=False)
    content: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    exercises: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    week_index: Mapped[int] = mapped_column(Integer, nullable=False)
    day_index: Mapped[int] = mapped_column(Integer, nullable=False)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    study_plan: Mapped["StudyPlan"] = relationship(back_populates="lessons")
