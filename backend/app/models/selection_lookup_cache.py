import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class SelectionLookupCache(Base):
    __tablename__ = "selection_lookup_cache"
    __table_args__ = (
        UniqueConstraint("user_id", "language", "normalized_span", name="uq_selection_lookup_user_lang_span"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    language: Mapped[str] = mapped_column(String(32), nullable=False)
    normalized_span: Mapped[str] = mapped_column(Text, nullable=False)
    translation_pl: Mapped[str] = mapped_column(Text, nullable=False)
    example_l2: Mapped[str] = mapped_column(Text, nullable=False)
    example_pl: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
