from __future__ import annotations

import uuid
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.domain.selection.normalize import normalize_span


class TranslateSelectionRequest(BaseModel):
    span: str
    language: str = Field(min_length=2)
    context_sentence: str | None = None
    conversation_id: uuid.UUID | None = None

    @field_validator("span")
    @classmethod
    def span_non_empty(cls, v: str) -> str:
        n = normalize_span(v)
        if not n:
            raise ValueError("span must be non-empty")
        return n


class TranslateSelectionResponse(BaseModel):
    span: str
    translation_pl: str
    example_l2: str
    example_pl: str
    from_cache: bool


class AddSelectionPendingRequest(BaseModel):
    span: str
    language: str = Field(min_length=2)
    conversation_id: uuid.UUID | None = None
    translation_pl: str | None = None
    context_sentence: str | None = None

    @field_validator("span")
    @classmethod
    def span_non_empty(cls, v: str) -> str:
        n = normalize_span(v)
        if not n:
            raise ValueError("span must be non-empty")
        return n


class AddSelectionPendingResponse(BaseModel):
    status: Literal["created", "already_exists", "reopened"]
    vocab_item_id: uuid.UUID
    term: str
