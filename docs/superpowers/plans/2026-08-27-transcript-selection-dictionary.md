# Transcript Selection + Dictionary (Package 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In an active Chat session, show an always-visible transcript; let the learner select a word/span/sentence and either Translate (PL + example) or Add to learning (Pending `transcript_selection`), via REST + per-user cache.

**Architecture:** Pure domain helpers (normalize, dedup key) → SQLAlchemy/Postgres `selection_lookup_cache` + vocab pending upsert → FastAPI routes under `/api/chat/selection/*` with spend_cap + Langfuse → Next.js Chat UI (selection sheet + translate panel). No Gemini Live tools for this flow.

**Tech Stack:** Python 3.12 / FastAPI / SQLAlchemy / pytest; Next.js PWA (greenfield) / TypeScript; Supabase Postgres; OpenRouter via `TextCompletionProvider`; Langfuse prompts `selection_translate` / `selection_pending_card`; promptfoo fixtures.

**Spec:** `docs/superpowers/specs/2026-08-27-transcript-selection-dictionary-design.md`

## Global Constraints

- L1 (native) is always Polish — not configurable.
- Product UI copy in English; Polish only in translations / learner L1 content.
- `source=transcript_selection` → `status=pending` only (never auto-accepted).
- `agent_save` remains accepted+FSRS; do not change that path.
- Dedup key: `(user_id, language, lower(trim(normalized_span)))`.
- At spend_cap: block Translate and Add; FSRS review still allowed.
- Cache is per-user: `unique(user_id, language, normalized_span)`.
- No auto-split of multi-word selections into multiple Pending rows.
- Rejected term may return to `pending` on Add (refresh translation).
- Repo may still be docs-only: Task 0 must pass before Tasks 1+.
- Paths assume monorepo `backend/` + `frontend/` (greenfield scaffold per architecture §9).

---

## File structure (target)

| Path | Responsibility |
|---|---|
| `backend/app/domain/selection/normalize.py` | `normalize_span`, `dedup_key` |
| `backend/app/domain/selection/schemas.py` | Pydantic request/response + GenAI JSON shapes |
| `backend/app/domain/selection/service.py` | `translate_selection`, `add_selection_pending` |
| `backend/app/models/selection_lookup_cache.py` | ORM entity |
| `backend/alembic/versions/xxxx_selection_lookup_cache.py` | Migration |
| `backend/app/api/routes/selection.py` | REST handlers |
| `backend/tests/domain/selection/test_normalize.py` | Unit tests |
| `backend/tests/domain/selection/test_service.py` | Service tests (mocked provider + repo) |
| `backend/tests/api/test_selection_routes.py` | API + cap/cache |
| `backend/promptfoo/selection_translate.yaml` | Prompt regression |
| `frontend/src/components/chat/TranscriptPane.tsx` | Always-on finalized lines + selection |
| `frontend/src/components/chat/SelectionActionSheet.tsx` | Translate \| Add \| Dismiss |
| `frontend/src/components/chat/TranslatePanel.tsx` | Result + Add CTA |
| `frontend/src/lib/api/selection.ts` | Client fetch helpers |
| `frontend/src/components/memo/PendingSourceBadge.tsx` | Label for `transcript_selection` |

---

### Task 0: Prerequisite gate (greenfield scaffold)

**Files:** none (verification only)

**Interfaces:**
- Consumes: Chat session API, `conversations.transcript`, JWT auth, `usage_ledger` + spend_cap helper, Memo → Flashcards Pending Accept/Reject UI, `TextCompletionProvider`
- Produces: confirmation that Package 1 can mount

- [ ] **Step 1: Verify backend/frontend trees exist**

Run:

```bash
ls backend frontend
```

Expected: both directories present (greenfield scaffold from architecture §9 build order). If missing: scaffold FastAPI + Next.js PWA first; do not import FreeLingo.

- [ ] **Step 2: Verify spend_cap helper is importable**

Run:

```bash
cd backend && pytest -q -k spend_cap --collect-only
```

Expected: at least one collected test or module for monthly cap. If none, implement cap before Package 1 (architecture §7.4).

- [ ] **Step 3: Verify Pending vocab path exists**

Confirm `vocab_items` with `status` pending|accepted|rejected and Memo → Flashcards Pending UI. If missing, finish extraction Accept/Reject first.

- [ ] **Step 4: Commit nothing** (gate only)

---

### Task 1: Span normalization (TDD)

**Files:**
- Create: `backend/app/domain/selection/normalize.py`
- Create: `backend/app/domain/selection/__init__.py`
- Test: `backend/tests/domain/selection/test_normalize.py`

**Interfaces:**
- Consumes: none
- Produces:
  - `normalize_span(raw: str) -> str`
  - `dedup_key(user_id: str, language: str, raw: str) -> tuple[str, str, str]`  
    → `(user_id, language, normalize_span(raw).casefold())`

- [ ] **Step 1: Write the failing tests**

```python
# backend/tests/domain/selection/test_normalize.py
from app.domain.selection.normalize import normalize_span, dedup_key


def test_normalize_trims_and_collapses_whitespace():
    assert normalize_span("  hello   world\n") == "hello world"


def test_normalize_empty_or_whitespace_is_empty():
    assert normalize_span("   \t") == ""


def test_dedup_key_is_casefold():
    a = dedup_key("u1", "en-GB", "Café")
    b = dedup_key("u1", "en-GB", "café")
    assert a == b
    assert a == ("u1", "en-GB", "café")
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd backend && pytest tests/domain/selection/test_normalize.py -v
```

Expected: FAIL (import / not found)

- [ ] **Step 3: Minimal implementation**

```python
# backend/app/domain/selection/normalize.py
from __future__ import annotations

import unicodedata


def normalize_span(raw: str) -> str:
    text = unicodedata.normalize("NFC", raw or "")
    return " ".join(text.split())


def dedup_key(user_id: str, language: str, raw: str) -> tuple[str, str, str]:
    return (user_id, language, normalize_span(raw).casefold())
```

```python
# backend/app/domain/selection/__init__.py
from .normalize import dedup_key, normalize_span

__all__ = ["normalize_span", "dedup_key"]
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd backend && pytest tests/domain/selection/test_normalize.py -v
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/domain/selection backend/tests/domain/selection/test_normalize.py
git commit -m "feat(selection): add span normalization and dedup key"
```

---

### Task 2: Pydantic schemas + cache model + migration

**Files:**
- Create: `backend/app/domain/selection/schemas.py`
- Create: `backend/app/models/selection_lookup_cache.py`
- Create: `backend/alembic/versions/20260827_selection_lookup_cache.py` (timestamp may differ)
- Modify: `backend/app/models/__init__.py` (export model)
- Test: `backend/tests/domain/selection/test_schemas.py`

**Interfaces:**
- Consumes: existing Base / Alembic env
- Produces:
  - `TranslateSelectionRequest(span, language, context_sentence: str | None, conversation_id: uuid | None)`
  - `TranslateSelectionResponse(span, translation_pl, example_l2, example_pl, from_cache: bool)`
  - `AddSelectionPendingRequest(span, language, conversation_id: uuid | None, translation_pl: str | None, context_sentence: str | None)`
  - `AddSelectionPendingResponse(status: Literal["created","already_exists","reopened"], vocab_item_id: uuid, term: str)`
  - ORM `SelectionLookupCache`

- [ ] **Step 1: Failing schema test**

```python
# backend/tests/domain/selection/test_schemas.py
import pytest
from pydantic import ValidationError
from app.domain.selection.schemas import TranslateSelectionRequest


def test_translate_request_rejects_blank_span():
    with pytest.raises(ValidationError):
        TranslateSelectionRequest(span="  ", language="en-GB")
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd backend && pytest tests/domain/selection/test_schemas.py -v
```

- [ ] **Step 3: Implement schemas + model + migration**

```python
# backend/app/domain/selection/schemas.py
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
```

```python
# backend/app/models/selection_lookup_cache.py
import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class SelectionLookupCache(Base):
    __tablename__ = "selection_lookup_cache"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "language", "normalized_span",
            name="uq_selection_lookup_user_lang_span",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    language: Mapped[str] = mapped_column(String(32), nullable=False)
    normalized_span: Mapped[str] = mapped_column(Text, nullable=False)
    translation_pl: Mapped[str] = mapped_column(Text, nullable=False)
    example_l2: Mapped[str] = mapped_column(Text, nullable=False)
    example_pl: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
```

Migration (Alembic) must create the same table + unique constraint. Also ensure `vocab_items.source` check constraint / docs allow `transcript_selection` (alter check if present).

- [ ] **Step 4: Run schema tests + upgrade head**

```bash
cd backend && pytest tests/domain/selection/test_schemas.py -v
cd backend && alembic upgrade head
```

Expected: PASS; migration applied

- [ ] **Step 5: Commit**

```bash
git add backend/app/domain/selection/schemas.py backend/app/models/selection_lookup_cache.py backend/alembic/versions backend/tests/domain/selection/test_schemas.py
git commit -m "feat(selection): add schemas and selection_lookup_cache table"
```

---

### Task 3: `translate_selection` service (cache + GenAI + ledger)

**Files:**
- Create: `backend/app/domain/selection/service.py`
- Test: `backend/tests/domain/selection/test_service_translate.py`

**Interfaces:**
- Consumes: `normalize_span`; `TextCompletionProvider.complete`; spend_cap checker; Langfuse prompt `selection_translate`; DB session
- Produces: `async def translate_selection(db, user_id, req: TranslateSelectionRequest, *, provider, cap_ok: bool) -> TranslateSelectionResponse`  
  Raises `SpendCapExceeded` when `not cap_ok`

Behavior:
1. If not `cap_ok` → raise (even on would-be cache hit? Spec: at cap block Translate — **always raise**, no cache read required for product consistency, OR allow cache hit free. **Lock for implementer: allow cache hit without GenAI even at cap; block only cache miss.** Wait — spec table says "At spend_cap | Translate | 402; no GenAI". Serving cache is not GenAI. **Decision in plan: cache hit OK at cap; cache miss → 402.**

Clarify against spec: "At cap: Translate and Add blocked". Strict reading = block both. Spec decision table: block Add always at cap. For Translate GWT: "402/403; no GenAI".

**Implementer lock:** At cap → Translate returns 402 always (simplest, matches UX "costly actions blocked"). Cache still filled when under cap.

- [ ] **Step 1: Failing tests**

```python
# backend/tests/domain/selection/test_service_translate.py
import pytest
from unittest.mock import AsyncMock, MagicMock
from app.domain.selection.schemas import TranslateSelectionRequest
from app.domain.selection.service import SpendCapExceeded, translate_selection


@pytest.mark.asyncio
async def test_translate_cache_hit_skips_provider():
    db = MagicMock()
    # arrange: repo returns cached row — implement with fake session/repo as used in project
    provider = AsyncMock()
    req = TranslateSelectionRequest(span="hello", language="en-GB")
    # ... wire fake cache hit ...
    result = await translate_selection(db, user_id="00000000-0000-0000-0000-000000000001", req=req, provider=provider, cap_ok=True)
    provider.complete.assert_not_awaited()
    assert result.from_cache is True


@pytest.mark.asyncio
async def test_translate_at_cap_raises():
    db = MagicMock()
    provider = AsyncMock()
    req = TranslateSelectionRequest(span="hello", language="en-GB")
    with pytest.raises(SpendCapExceeded):
        await translate_selection(db, user_id="00000000-0000-0000-0000-000000000001", req=req, provider=provider, cap_ok=False)
```

(Adapt mocks to project's session pattern; keep assertions.)

- [ ] **Step 2: Run — FAIL**

```bash
cd backend && pytest tests/domain/selection/test_service_translate.py -v
```

- [ ] **Step 3: Implement service translate path**

```python
# backend/app/domain/selection/service.py (translate portion)
class SpendCapExceeded(Exception):
    pass


async def translate_selection(db, user_id, req, *, provider, cap_ok: bool):
    if not cap_ok:
        raise SpendCapExceeded()
    span = req.span  # already normalized by schema
    cached = await get_cache(db, user_id, req.language, span)
    if cached:
        return TranslateSelectionResponse(
            span=span,
            translation_pl=cached.translation_pl,
            example_l2=cached.example_l2,
            example_pl=cached.example_pl,
            from_cache=True,
        )
    data = await call_selection_translate_prompt(provider, req)  # Langfuse + JSON parse
    await upsert_cache(db, user_id, req.language, span, data)
    await write_usage_ledger_genai(db, user_id, ...)  # existing helper
    return TranslateSelectionResponse(span=span, from_cache=False, **data)
```

Wire `get_cache` / `upsert_cache` / ledger / Langfuse to existing project helpers.

- [ ] **Step 4: Tests PASS**

```bash
cd backend && pytest tests/domain/selection/test_service_translate.py -v
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/domain/selection/service.py backend/tests/domain/selection/test_service_translate.py
git commit -m "feat(selection): translate with cache, cap, and ledger"
```

---

### Task 4: `add_selection_pending` service

**Files:**
- Modify: `backend/app/domain/selection/service.py`
- Test: `backend/tests/domain/selection/test_service_pending.py`

**Interfaces:**
- Consumes: normalize; vocab repository; optional translation from request or GenAI `selection_pending_card`; spend_cap
- Produces: `async def add_selection_pending(...) -> AddSelectionPendingResponse`

Rules:
- `cap_ok is False` → `SpendCapExceeded` always
- If existing `accepted` or `pending` with same dedup key → `already_exists` (no GenAI)
- If existing `rejected` → set `pending`, refresh `translation` / `context_sentence`, `source=transcript_selection` → `reopened`
- Else insert pending → `created` (GenAI if `translation_pl` missing)

- [ ] **Step 1: Failing tests** for created / already_exists / reopened / cap

```python
@pytest.mark.asyncio
async def test_add_pending_reopens_rejected():
    ...
    assert result.status == "reopened"


@pytest.mark.asyncio
async def test_add_pending_at_cap_raises():
    with pytest.raises(SpendCapExceeded):
        await add_selection_pending(..., cap_ok=False)
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement `add_selection_pending`**

- [ ] **Step 4: Run — PASS**

```bash
cd backend && pytest tests/domain/selection/test_service_pending.py -v
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/domain/selection/service.py backend/tests/domain/selection/test_service_pending.py
git commit -m "feat(selection): add transcript span to Pending vocab"
```

---

### Task 5: FastAPI routes

**Files:**
- Create: `backend/app/api/routes/selection.py`
- Modify: API router include
- Test: `backend/tests/api/test_selection_routes.py`

**Interfaces:**
- `POST /api/chat/selection/translate` → 200 | 401 | 402
- `POST /api/chat/selection/pending` → 200 | 401 | 402
- Auth: same JWT dependency as other user routes
- Cap: call existing `user_under_spend_cap(user)` 

- [ ] **Step 1: API tests with TestClient / httpx ASGI** (auth fixture from project)

```python
def test_translate_returns_402_at_cap(client, auth_headers, monkeypatch):
    monkeypatch.setattr("...", "user_under_spend_cap", lambda u: False)
    r = client.post("/api/chat/selection/translate", json={"span": "hi", "language": "en-GB"}, headers=auth_headers)
    assert r.status_code == 402
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement routes + register router**

```python
@router.post("/api/chat/selection/translate", response_model=TranslateSelectionResponse)
async def translate(...):
    try:
        return await translate_selection(...)
    except SpendCapExceeded:
        raise HTTPException(status_code=402, detail="Monthly spend cap reached")
```

- [ ] **Step 4: Run — PASS**

```bash
cd backend && pytest tests/api/test_selection_routes.py -v
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/routes/selection.py backend/tests/api/test_selection_routes.py
git commit -m "feat(api): selection translate and pending endpoints"
```

---

### Task 6: Langfuse prompts + promptfoo

**Files:**
- Create: `backend/promptfoo/selection_translate.yaml`
- Create: `backend/promptfoo/selection_pending_card.yaml`
- Document prompt names in Langfuse Cloud (manual): `selection_translate`, `selection_pending_card`

**Interfaces:**
- Prompt JSON out: `{ "translation_pl": "...", "example_l2": "...", "example_pl": "..." }` for translate
- Pending card: `{ "translation_pl": "...", "context_sentence": "..." }`

- [ ] **Step 1: Add fixtures asserting JSON schema / required keys**

- [ ] **Step 2: Run promptfoo** (project CI command from AGENTS when present)

```bash
cd backend && npx promptfoo eval -c promptfoo/selection_translate.yaml
```

Expected: pass or skip if keys missing in CI — fixtures must be loadable.

- [ ] **Step 3: Commit**

```bash
git add backend/promptfoo/selection_translate.yaml backend/promptfoo/selection_pending_card.yaml
git commit -m "test(promptfoo): selection translate and pending card prompts"
```

---

### Task 7: Frontend — always-on transcript + selection sheet

**Files:**
- Create/Modify: `frontend/src/components/chat/TranscriptPane.tsx`
- Create: `frontend/src/components/chat/SelectionActionSheet.tsx`
- Modify: Chat page/container to always render `TranscriptPane` in active session
- Test: `frontend/src/components/chat/TranscriptPane.test.tsx` (Vitest/Jest per frontend setup)

**Interfaces:**
- Props: `turns: { id: string; role: "user"|"agent"; text: string; finalized: boolean }[]`
- On selection: only `finalized===true` text nodes participate
- Emits `onSelectSpan({ span, contextSentence })` then shows sheet

- [ ] **Step 1: Component test — sheet opens with Translate and Add**

- [ ] **Step 2: Run FE test — FAIL**

```bash
cd frontend && npm test -- TranscriptPane
```

- [ ] **Step 3: Implement pane + sheet (Classical tokens; English copy: "Translate", "Add to learning")

- [ ] **Step 4: Tests PASS**

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/chat
git commit -m "feat(chat): always-on transcript with selection action sheet"
```

---

### Task 8: Frontend — API client + Translate panel + Add

**Files:**
- Create: `frontend/src/lib/api/selection.ts`
- Create: `frontend/src/components/chat/TranslatePanel.tsx`
- Wire sheet actions to API; toast on pending result; refresh Pending badge query

**Interfaces:**

```typescript
export async function translateSelection(body: {
  span: string;
  language: string;
  context_sentence?: string;
  conversation_id?: string;
}): Promise<TranslateSelectionResponse>;

export async function addSelectionPending(body: {
  span: string;
  language: string;
  translation_pl?: string;
  context_sentence?: string;
  conversation_id?: string;
}): Promise<AddSelectionPendingResponse>;
```

- [ ] **Step 1: Test TranslatePanel shows Add CTA and calls pending API**

- [ ] **Step 2: FAIL → implement → PASS**

- [ ] **Step 3: Handle 402 with same spend-cap messaging as Chat**

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/api/selection.ts frontend/src/components/chat/TranslatePanel.tsx
git commit -m "feat(chat): translate panel and add-to-pending from selection"
```

---

### Task 9: Memo Pending source label

**Files:**
- Modify: Pending list component to map `transcript_selection` → label `"Transcript"`
- Test: unit/snapshot for source badge

- [ ] **Step 1–4: TDD label mapping + commit**

```bash
git commit -m "feat(words): show Transcript source for selection pending items"
```

---

### Task 10: Verification + docs status

**Files:**
- Modify: `docs/superpowers/specs/2026-08-27-transcript-selection-dictionary-design.md` status → `approved / implemented` when done
- Modify: `.cursor/plans/2026-08-27-transcript-selection-dictionary.md` todos

- [ ] **Step 1: Run full backend selection tests**

```bash
cd backend && pytest tests/domain/selection tests/api/test_selection_routes.py -v
```

- [ ] **Step 2: Run frontend tests for chat selection**

```bash
cd frontend && npm test -- --testPathPattern=chat
```

- [ ] **Step 3: Manual smoke** — start session, select word, Translate, Add, see Pending badge, Accept in Memo → Flashcards

- [ ] **Step 4: Commit docs status**

```bash
git add docs .cursor/plans
git commit -m "docs: mark transcript selection package 1 implemented"
```

---

## Spec coverage self-review

| Spec requirement | Task |
|---|---|
| Always-visible transcript | 7 |
| Select word / multi / sentence | 7 |
| Translate \| Add sheet | 7–8 |
| Translate = PL + example L2/PL | 3, 5, 8 |
| Add → Pending `transcript_selection` | 4, 5, 8 |
| Add after Translate | 8 |
| Per-user cache | 2, 3 |
| Cap blocks Translate/Add | 3, 4, 5, 8 |
| Dedup + reopen rejected | 1, 4 |
| No auto-split | 4 |
| Langfuse + promptfoo | 3, 6 |
| Pending source label | 9 |
| REST not Live tools | 5 |
| No mnemonics/shadowing/correction | out of scope |

**Placeholder scan:** none intentional.

**Type consistency:** `TranslateSelectionRequest/Response`, `AddSelectionPendingRequest/Response`, `SpendCapExceeded`, `normalize_span` used throughout.

---

## Execution handoff

Plan saved to `docs/superpowers/plans/2026-08-27-transcript-selection-dictionary.md`.

**Important:** This repo currently has **no** `backend/` / `frontend/` app code. Task 0 blocks until **greenfield MVP skeleton** (Chat, Pending, spend_cap) exists per architecture §9.
