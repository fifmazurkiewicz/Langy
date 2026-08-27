# Shadowing + Memo IA (Package 4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Memo shell (Flashcards + Shadowing + Mnemonics); ship Shadowing sessions (topic → generate or pick conversation → TTS|Live loop → Pending).

**Architecture:** Dedicated `/api/shadowing/*` + `shadowing_sessions` table. FE Memo shell with Flashcards and Shadowing flows. Model line audio via TTS or Live credentials; user repeats via STT; feedback GenAI; Pending `source=shadowing`.

**Tech Stack:** FastAPI, SQLAlchemy/Postgres/Alembic, pytest, Next.js/TS, TTS/STT providers, optional Live session mint, Langfuse, promptfoo, spend_cap.

**Spec:** `docs/superpowers/specs/2026-08-27-shadowing-memo-design.md`

## Global Constraints

- Bottom tabs: Chat / Memo / Menu only (no 4th tab).
- Memo sub-tabs: Flashcards | Shadowing (+ future reserved).
- Show-text default **on**; when **off**, reveal line text only after user attempt.
- Audio switch: **TTS | Live**; both meter spend_cap.
- Pending source: `shadowing`; mid-Add + end batch.
- L1 tip language: Polish.
- Chat remains default home; Plan stays in Menu.
- Task 0 blocks until Chat conversations list + Flashcards/Pending + TTS/STT (+ Live mint if Live path) exist.
- No feature coding until planning complete if user still requires it — this document is the plan only.

---

## File structure

| Path | Responsibility |
|---|---|
| `backend/app/models/shadowing_session.py` | ORM |
| `backend/alembic/versions/*_shadowing_sessions.py` | Migration + allow `shadowing` source |
| `backend/app/domain/shadowing/schemas.py` | Pydantic API models |
| `backend/app/domain/shadowing/dialogue.py` | Generate dialogue / parse conversation → lines |
| `backend/app/domain/shadowing/service.py` | Session lifecycle, turns, hard-line summary |
| `backend/app/domain/shadowing/pending.py` | Pending upserts `source=shadowing` |
| `backend/app/api/routes/shadowing.py` | REST |
| `backend/promptfoo/shadowing_*.yaml` | Three prompts |
| `backend/tests/domain/shadowing/*.py` | Unit/service |
| `backend/tests/api/test_shadowing_routes.py` | API + 402 |
| `frontend/src/app/(app)/memo/...` | Memo layout + Flashcards + Shadowing routes |
| `frontend/src/components/memo/MemoTabs.tsx` | Sub-tab switcher |
| `frontend/src/components/shadowing/*` | Intake, picker, setup, loop, end batch |
| `frontend/src/lib/api/shadowing.ts` | Client |

Rename/move Flashcards routes/components under Memo in the same FE tasks.

---

### Task 0: Prerequisites

- [ ] **Step 1:** Conversations list API (filter by `language`) exists.
- [ ] **Step 2:** Pending create path + Memo → Flashcards UI exist.
- [ ] **Step 3:** TTS + STT providers callable; Live short-lived credentials mint available for Live mode.
- [ ] **Step 4:** Stop if missing.

---

### Task 1: Model + migration (TDD schema)

**Files:**
- Create: `backend/app/models/shadowing_session.py`
- Create: Alembic migration
- Test: `backend/tests/domain/shadowing/test_model_constraints.py` (or migration smoke)

**Interfaces — `ShadowingSession` fields:**  
`id: UUID`, `user_id`, `language`, `topic: str | None`, `source: Literal["generated","conversation"]`, `conversation_id: UUID | None`, `dialogue: list[{id, role, text}]`, `show_text: bool`, `audio_mode: Literal["tts","live"]`, `started_at`, `ended_at | None`, `hard_line_ids: list[str] | None`

- [ ] **Step 1:** Write failing test that model/metadata lists required columns
- [ ] **Step 2:** `pytest … -v` FAIL
- [ ] **Step 3:** Implement model + migration (`vocab_items.source` allows `shadowing`)
- [ ] **Step 4:** `alembic upgrade head` + PASS
- [ ] **Step 5:** Commit `feat(shadowing): add shadowing_sessions table`

---

### Task 2: Dialogue builders (TDD)

**Files:**
- Create: `backend/app/domain/shadowing/dialogue.py`
- Test: `backend/tests/domain/shadowing/test_dialogue.py`

**Interfaces:**
- `async def generate_dialogue(provider, *, topic, language, cefr_level: str | None) -> list[DialogueLine]`
- `def lines_from_conversation_transcript(transcript: str | list[Turn]) -> list[DialogueLine]`  
  Target lines for practice: prefer `role=="agent"` (or every other line — **Decision:** practice **agent** lines only in MVP)

- [ ] **Step 1:** Unit test transcript parser yields ordered agent lines
- [ ] **Step 2:** FAIL → implement parser
- [ ] **Step 3:** Mocked generate returns ≥4 lines with ids
- [ ] **Step 4:** PASS → commit `feat(shadowing): dialogue generate and conversation parse`

---

### Task 3: Session service — create / turn / end

**Files:**
- Create: `backend/app/domain/shadowing/schemas.py`
- Create: `backend/app/domain/shadowing/service.py`
- Test: `backend/tests/domain/shadowing/test_service.py`

**Interfaces:**
- `async def create_session(..., cap_ok) -> ShadowingSession` — raises `SpendCapExceeded`
- `async def submit_turn(session_id, line_id, user_transcript, *, provider, cap_ok) -> TurnFeedback`  
  `TurnFeedback(ok: bool, corrected_text, explanation_pl, mark_hard: bool)`
- `async def summarize_hard_lines(session_id, *, provider) -> list[HardLine]`
- `async def end_session(session_id)`

Mark hard: model flag or client “difficult” toggle — **Decision:** GenAI sets `mark_hard` on weak match; user can also flag.

- [ ] **Step 1–5:** TDD create/cap/turn/end → commit `feat(shadowing): session service`

---

### Task 4: Pending helpers

**Files:**
- Create: `backend/app/domain/shadowing/pending.py`
- Test: `backend/tests/domain/shadowing/test_pending.py`

**Interfaces:**
- `async def add_shadowing_pending(user_id, language, term, translation, context_sentence) -> status`
- `async def add_shadowing_pending_batch(items: list[...]) -> counts`  
Reuse Package 1 normalize/dedup/reopen-rejected; `source="shadowing"`.

- [ ] **Step 1–5:** TDD → commit `feat(shadowing): pending from shadowing lines`

---

### Task 5: REST routes

**Files:**
- Create: `backend/app/api/routes/shadowing.py`
- Test: `backend/tests/api/test_shadowing_routes.py`

**Endpoints:**
- `POST /api/shadowing/sessions` body: `{ topic?, conversation_id?, show_text, audio_mode, language }`
- `POST /api/shadowing/sessions/{id}/tts` — synthesize current line (TTS mode)
- `POST /api/shadowing/sessions/{id}/live-token` — mint Live creds for one line (Live mode)
- `POST /api/shadowing/sessions/{id}/turns` — user transcript (+ optional audio ref later)
- `POST /api/shadowing/sessions/{id}/pending` — `{ line_ids: [] }` or single
- `POST /api/shadowing/sessions/{id}/end`
- Reuse `GET /api/conversations?language=` for picker

- [ ] **Step 1:** 402 on create at cap
- [ ] **Step 2–4:** Implement + PASS
- [ ] **Step 5:** Commit `feat(api): shadowing session endpoints`

---

### Task 6: promptfoo

**Files:**
- `backend/promptfoo/shadowing_dialogue_generate.yaml`
- `backend/promptfoo/shadowing_turn_feedback.yaml`
- `backend/promptfoo/shadowing_hard_lines_summary.yaml`

- [ ] **Step 1–3:** Fixtures → commit `test(promptfoo): shadowing prompts`

---

### Task 7: FE Memo shell

**Files:**
- Create: `frontend/src/app/(app)/memo/layout.tsx`, `flashcards/page.tsx`, `shadowing/page.tsx`, `mnemonics/page.tsx`
- `MemoTabs.tsx`
- Bottom nav: Chat / **Memo** / Menu; Pending badge on Memo
- Sub-tabs: Flashcards | Shadowing | Mnemonics

- [ ] **Step 1:** Test nav renders Memo with three sub-tabs
- [ ] **Step 2–4:** Implement Memo shell + Flashcards routes
- [ ] **Step 5:** Commit `feat(memo): Chat/Memo/Menu shell and Flashcards`

---

### Task 8: FE Shadowing flow UI

**Files:**
- `ShadowingIntake.tsx`, `ConversationPicker.tsx`, `ShadowingSetup.tsx`, `ShadowingLoop.tsx`, `HardLinesBatch.tsx`
- `frontend/src/lib/api/shadowing.ts`

**Behavior:**
- Intake → Generate or Pick → Setup (show-text, TTS|Live) → Loop (play, record, tip, Add) → End batch
- show-text off: hide prompt text until after attempt
- Cap: disable Start with same copy as Chat

- [ ] **Step 1–5:** Component tests + commit `feat(shadowing): Memo shadowing session UI`

---

### Task 9: Verification

- [ ] **Step 1:** `pytest tests/domain/shadowing tests/api/test_shadowing_routes.py -v`
- [ ] **Step 2:** FE tests memo/shadowing
- [ ] **Step 3:** Manual smoke TTS path + Live path + Pending badge + cap
- [ ] **Step 4:** Mark spec implemented; commit docs

---

## Spec coverage

| Spec | Task |
|---|---|
| Memo IA rename | 7 |
| Generate / pick conversation | 2, 3, 5, 8 |
| show-text / TTS\|Live | 3, 5, 8 |
| Loop feedback + Add | 3, 4, 8 |
| End hard batch | 3, 4, 8 |
| Cap | 3, 5, 8 |
| promptfoo | 6 |
| `shadowing_sessions` | 1 |

---

## Execution handoff

Plan: `docs/superpowers/plans/2026-08-27-shadowing-memo.md`.

Do not execute until Package 3 planning done (if user still wants all packages planned first). Then Subagent-Driven or Inline.
