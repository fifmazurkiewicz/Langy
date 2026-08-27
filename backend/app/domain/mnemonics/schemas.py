from __future__ import annotations

import uuid

from pydantic import BaseModel, Field, field_validator

from app.domain.selection.normalize import normalize_span


class GenerateMnemonicRequest(BaseModel):
    term: str
    language: str = Field(min_length=2)
    regenerate: bool = False

    @field_validator("term")
    @classmethod
    def term_non_empty(cls, v: str) -> str:
        n = normalize_span(v)
        if not n:
            raise ValueError("term must be non-empty")
        return n


class MnemonicResponse(BaseModel):
    term: str
    language: str
    association_pl: str
    example_l2: str
    example_pl: str
    from_cache: bool
