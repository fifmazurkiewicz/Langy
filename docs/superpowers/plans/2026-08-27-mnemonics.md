# Mnemonics (Package 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Memo third sub-tab Mnemonics (library of sound-associations) + Due card Mnemonic button; generate/regenerate via REST; cache in Postgres; cap-aware.

**Architecture:** `vocab_mnemonics` table + `POST /api/mnemonics/generate` with regenerate flag. FE Mnemonics list + shared `MnemonicPanel` used from Due.

**Tech Stack:** FastAPI, SQLAlchemy, pytest, Next.js, Langfuse `mnemonic_generate`, promptfoo.

**Spec:** `docs/superpowers/specs/2026-08-27-mnemonics-design.md`

## Global Constraints

- No images; no user-owned text.
- Accepted/FSRS terms only.
- Regenerate allowed; each GenAI call → ledger + cap.
- Same panel from Mnemonics tab and Due button.
- Memo sub-tabs: Flashcards | Shadowing | Mnemonics.
- Task 0: Flashcards Due + accepted vocab exist.

---

### Task 0: Prerequisites

- [ ] Accepted `vocab_items` + FSRS Due UI exist.
- [ ] Memo shell with Flashcards sub-tab (Package 4 Task 7 or earlier rename).

---

### Task 1: Model + migration

**Files:** `backend/app/models/vocab_mnemonic.py`, Alembic migration, test smoke

- [ ] TDD unique `(user_id, language, normalized_term)`
- [ ] Commit `feat(mnemonics): vocab_mnemonics table`

---

### Task 2: Generate service (TDD)

**Files:** `backend/app/domain/mnemonics/service.py`, `schemas.py`, tests

**Interfaces:**
- `async def generate_mnemonic(db, user_id, term, language, *, regenerate: bool, provider, cap_ok) -> MnemonicResponse`
- Cache hit if exists and not regenerate
- Raises `SpendCapExceeded` if not cap_ok

- [ ] Tests: miss, hit, regenerate replaces, cap
- [ ] Commit `feat(mnemonics): generate service with cache`

---

### Task 3: REST routes

**Files:** `backend/app/api/routes/mnemonics.py`, tests

- `GET /api/mnemonics/needs?language=`
- `POST /api/mnemonics/generate` `{ term, language, regenerate? }`
- `GET /api/mnemonics/{language}/{term}`

- [ ] 402 at cap; 400 pending-only term
- [ ] Commit `feat(api): mnemonics endpoints`

---

### Task 4: promptfoo

- [ ] `backend/promptfoo/mnemonic_generate.yaml`
- [ ] Commit `test(promptfoo): mnemonic_generate`

---

### Task 5: FE Mnemonics tab

**Files:** `frontend/src/app/(app)/memo/mnemonics/page.tsx`, `MnemonicPanel.tsx`, `MnemonicsList.tsx`, `lib/api/mnemonics.ts`

- [ ] List needs-mnemonic; Generate opens panel; Regenerate in panel
- [ ] Commit `feat(memo): mnemonics library tab`

---

### Task 6: Due card button

**Files:** Due review component — add **Mnemonic** button → `MnemonicPanel`

- [ ] Test opens same API
- [ ] Commit `feat(flashcards): mnemonic shortcut on due card`

---

### Task 7: MemoTabs third tab + verification

- [ ] Add Mnemonics to `MemoTabs` alongside Flashcards, Shadowing
- [ ] pytest + FE tests; manual cap smoke
- [ ] Docs status implemented

---

## Spec coverage

| Spec | Task |
|---|---|
| Library tab | 5, 7 |
| Due shortcut | 6 |
| Regenerate + cap | 2, 3, 5 |
| Cache table | 1, 2 |
| Accepted only | 2, 3 |
