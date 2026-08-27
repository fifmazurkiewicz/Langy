import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class VocabMnemonic(Base):
    __tablename__ = "vocab_mnemonics"
    __table_args__ = (
        UniqueConstraint("user_id", "language", "normalized_term", name="uq_vocab_mnemonic_user_lang_term"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    language: Mapped[str] = mapped_column(String(32), nullable=False)
    normalized_term: Mapped[str] = mapped_column(Text, nullable=False)
    vocab_item_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("vocab_items.id"), nullable=True
    )
    association_pl: Mapped[str] = mapped_column(Text, nullable=False)
    example_l2: Mapped[str] = mapped_column(Text, nullable=False)
    example_pl: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
