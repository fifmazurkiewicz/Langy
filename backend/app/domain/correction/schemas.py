from __future__ import annotations

import re
import uuid
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.domain.selection.normalize import normalize_span


class CorrectionRequest(BaseModel):
    text: str
    language: str = Field(min_length=2)
    conversation_id: uuid.UUID | None = None
    turn_id: str | None = None
    mode: Literal["auto", "check"] = "auto"
    context_before: str | None = None
    context_after: str | None = None

    @field_validator("text")
    @classmethod
    def text_non_empty(cls, v: str) -> str:
        n = normalize_span(v)
        if not n:
            raise ValueError("text must be non-empty")
        return n


class CorrectionResponse(BaseModel):
    is_corrected: bool
    corrected_text: str | None = None
    explanation_pl: str | None = None
    mistake_type: Literal["Grammar", "Word choice", "Pronunciation"] | None = None
    original_text: str


class AddCorrectionPendingRequest(BaseModel):
    original_text: str
    corrected_text: str
    language: str = Field(min_length=2)
    conversation_id: uuid.UUID | None = None
    explanation_pl: str | None = None

    @field_validator("original_text", "corrected_text")
    @classmethod
    def non_empty(cls, v: str) -> str:
        n = normalize_span(v)
        if not n:
            raise ValueError("must be non-empty")
        return n


class AddCorrectionPendingResponse(BaseModel):
    status: Literal["created", "already_exists", "reopened"]
    vocab_item_id: uuid.UUID
    term: str
