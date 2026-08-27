# In-flight Correction (Package 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto substantive correction tips under user transcript lines plus on-demand Check; Add → Pending `correction`; REST-only; Live parallel / chained STT→correction→LLM.

**Architecture:** Shared `POST /api/chat/correction` + domain service (`turn_correction` Langfuse prompt). FE shows rolled tip and wires Check into selection sheet on user lines. Chained pipeline awaits correction before LLM; Live fires correction without blocking agent audio.

**Tech Stack:** FastAPI, SQLAlchemy/Postgres, pytest, Next.js/TS, Langfuse, promptfoo, existing spend_cap + Package 1 normalize/Pending helpers.

**Spec:** `docs/superpowers/specs/2026-08-27-inflight-correction-design.md`

## Global Constraints

- L1 explanations always Polish.
- Punctuation/case-only → `is_corrected=false`, no tip UI.
- Cap blocks auto and Check (HTTP 402).
- Pending `source=correction`; term = corrected L2; context = original utterance.
- No Mistakes queue; no Live-tool correction path.
- Depends on Package 1 transcript UI + selection sheet patterns.
- Repo may lack `backend/`/`frontend/` until greenfield scaffold lands — Task 0 gates.

---

## File structure

| Path | Responsibility |
|---|---|
| `backend/app/domain/correction/schemas.py` | Request/response Pydantic |
| `backend/app/domain/correction/service.py` | `run_correction`, punct policy helpers |
| `backend/app/domain/correction/pending.py` | Add Pending from correction |
| `backend/app/api/routes/correction.py` | REST handlers |
| `backend/app/services/conversation_pipeline.py` (or Langy equivalent) | Chained: STT → correction → LLM |
| `backend/promptfoo/turn_correction.yaml` | Prompt regression |
| `backend/tests/domain/correction/*.py` | Unit/service tests |
| `backend/tests/api/test_correction_routes.py` | API + 402 |
| `frontend/src/lib/api/correction.ts` | Client |
| `frontend/src/components/chat/CorrectionTip.tsx` | Rolled tip + Add |
| `frontend/src/components/chat/TranscriptPane.tsx` | Auto hook + tip slot |
| `frontend/src/components/chat/SelectionActionSheet.tsx` | Check on user lines |

---

### Task 0: Prerequisites

**Files:** none

- [ ] **Step 1:** Package 1 transcript + selection sheet present (or stub interfaces agreed).
- [ ] **Step 2:** `spend_cap` + `TextCompletionProvider` + Pending create path exist.
- [ ] **Step 3:** Confirm `VOICE_MODE` branching exists for Live vs chained.
- [ ] **Step 4:** Stop if missing — finish Chat skeleton first.

---

### Task 1: Schemas + substantive helper (TDD)

**Files:**
- Create: `backend/app/domain/correction/schemas.py`
- Create: `backend/app/domain/correction/substantive.py`
- Test: `backend/tests/domain/correction/test_substantive.py`

**Interfaces:**
- Produces: `CorrectionRequest`, `CorrectionResponse`, `is_substantive_diff(original: str, corrected: str) -> bool`

- [ ] **Step 1: Failing tests**

```python
from app.domain.correction.substantive import is_substantive_diff

def test_case_only_not_substantive():
    assert is_substantive_diff("Hello", "hello") is False

def test_punct_only_not_substantive():
    assert is_substantive_diff("Hello", "Hello?") is False

def test_word_change_is_substantive():
    assert is_substantive_diff("I go shop", "I go to the shop") is True
```

- [ ] **Step 2:** `pytest tests/domain/correction/test_substantive.py -v` → FAIL

- [ ] **Step 3: Implement** — normalize by lowercasing and stripping punctuation/whitespace for compare; if equal after normalize → False.

- [ ] **Step 4:** PASS → commit `feat(correction): substantive diff helper and schemas`

---

### Task 2: `run_correction` service

**Files:**
- Create: `backend/app/domain/correction/service.py`
- Test: `backend/tests/domain/correction/test_service.py`

**Interfaces:**
- `async def run_correction(db, user_id, req: CorrectionRequest, *, provider, cap_ok: bool) -> CorrectionResponse`
- Raises `SpendCapExceeded` if not `cap_ok`
- Always charges GenAI when provider called; if model says corrected but `not is_substantive_diff` → force `is_corrected=False`

- [ ] **Step 1:** Tests for cap raise, substantive force-false, happy path with mocked provider JSON

- [ ] **Step 2–4:** FAIL → implement Langfuse `turn_correction` → PASS → commit `feat(correction): run_correction service`

---

### Task 3: Pending from correction

**Files:**
- Create: `backend/app/domain/correction/pending.py`
- Test: `backend/tests/domain/correction/test_pending.py`

**Interfaces:**
- `async def add_correction_pending(...) -> AddSelectionPendingResponse`-compatible shape
- Reuse Package 1 normalize/dedup/reopen-rejected rules; `source="correction"`

- [ ] **Step 1–5:** TDD create/already_exists/reopened/cap → commit `feat(correction): pending from correction tip`

---

### Task 4: API routes

**Files:**
- Create: `backend/app/api/routes/correction.py`
- Register router
- Test: `backend/tests/api/test_correction_routes.py`

**Interfaces:**
- `POST /api/chat/correction` → 200 | 401 | 402
- `POST /api/chat/correction/pending` → 200 | 401 | 402 (body: original_text, corrected_text, language, conversation_id?, explanation_pl?)

- [ ] **Step 1–5:** TDD 402 + auth → commit `feat(api): correction and correction-pending endpoints`

---

### Task 5: Chained orchestration hook

**Files:**
- Modify: conversation/chained pipeline module
- Test: `backend/tests/services/test_chained_correction_order.py`

**Interfaces:**
- After STT text: `await run_correction(..., mode="auto")` (ignore result for LLM prompt unless product later wants it); then LLM.
- Persist correction JSON on user turn when `turn_id` known.

- [ ] **Step 1:** Test asserts call order STT → correction → LLM with mocks

- [ ] **Step 2–4:** Implement → PASS → commit `feat(voice): chained STT then correction then LLM`

---

### Task 6: promptfoo

**Files:**
- Create: `backend/promptfoo/turn_correction.yaml`

- [ ] **Step 1–3:** Fixture for JSON keys + ignore punct case instruction → commit `test(promptfoo): turn_correction`

---

### Task 7: FE CorrectionTip + auto wiring

**Files:**
- Create: `frontend/src/lib/api/correction.ts`
- Create: `frontend/src/components/chat/CorrectionTip.tsx`
- Modify: `TranscriptPane.tsx` / Chat session controller

**Interfaces:**
- On user turn finalized + Live: `void translateCorrection()` (fire-and-forget); do not await before agent playback.
- Render tip when `is_corrected`; rolled expand; Add calls pending API.
- Cap 402: hide auto; show cap message on Check only.

- [ ] **Step 1–5:** Component tests for rolled expand + Add → commit `feat(chat): correction tip and live auto-correct`

---

### Task 8: Selection sheet Check

**Files:**
- Modify: `SelectionActionSheet.tsx`
- Test: sheet shows Check only when `role==="user"`

- [ ] **Step 1–5:** TDD → commit `feat(chat): Check action on user transcript selection`

---

### Task 9: Memo Pending label + verification

**Files:**
- Pending source map: `correction` → `"Correction"`
- Docs status → implemented when done

- [ ] **Step 1:** `pytest` correction suite
- [ ] **Step 2:** FE tests chat correction
- [ ] **Step 3:** Manual — auto tip, Check, Add → Pending badge, cap 402
- [ ] **Step 4:** Commit docs status

---

## Spec coverage

| Spec item | Task |
|---|---|
| REST correction | 2, 4 |
| Substantive filter | 1, 2 |
| Cap 402 | 2, 4, 7 |
| Live parallel | 7 |
| Chained order | 5 |
| Rolled tip + PL | 7 |
| Check on user line | 8 |
| Add → Pending correction | 3, 4, 7 |
| promptfoo | 6 |
| Pending label | 9 |

---

## Execution handoff

Plan saved to `docs/superpowers/plans/2026-08-27-inflight-correction.md`.

**Do not execute coding yet** if global rule “no feature code until planning finishes” still holds — next plan packages 4 then 3, then execute.

**When implementing:** Subagent-Driven (recommended) vs Inline — choose at execution time.
