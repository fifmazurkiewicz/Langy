# Langy Jev Decisions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate Langy's existing correction generator with a server-side Jev decision through OpenRouter.

**Architecture:** Add a minimal synchronous Decisions API client beside the correction domain. `run_correction` asks Jev first; an explicit no skips the generator, while uncertain/error cases preserve the current generator path.

**Tech Stack:** Python, FastAPI, httpx, Pydantic settings, pytest.

**Spec:** `docs/superpowers/specs/2026-09-25-jev-decisions-design.md`

## Global Constraints

- Use `OPENROUTER_API_KEY`; model is exactly `typesafe/jev-1.13`.
- Never send the key to the client or persist raw utterances in decision logs.
- Retry only 429 and 5xx; uncertain/error must retain existing behavior.
- No new dependency.

## Review Focus

- A network failure must still produce the existing correction response.
- An explicit high-confidence no must avoid calling the generative provider.
- A malformed response must never be treated as a no-correction decision.
- Choice criteria include `other` and `none`.
- Events must contain a digest, not raw learner text.

---

### Task 1: Decisions client and tests

**Files:** Create `backend/app/domain/correction/jev.py`, `backend/tests/domain/correction/test_jev.py`; modify `backend/app/config.py`.

**Interfaces:** Produce `JevDecisionClient.decide(state: dict, questions: dict) -> dict | None` and `correction_decision(text: str, language: str) -> dict | None`.

- [ ] Write mocked tests for typed response parsing, bounded 429 retry, malformed response, and a SHA-256 state digest.
- [ ] Run `cd backend && python -m pytest tests/domain/correction/test_jev.py -q`; expect failure before implementation.
- [ ] Implement the `httpx` POST to `/api/alpha/decisions`, model `typesafe/jev-1.13`, and three-attempt bounded retry.
- [ ] Add `openrouter_api_key` reuse through existing settings; run the test file and expect pass.
- [ ] Commit `feat: add Langy Jev decision client`.

### Task 2: Correction routing

**Files:** Modify `backend/app/domain/correction/service.py`; modify `backend/tests/domain/correction/test_correction_service.py`.

**Interfaces:** Consume `correction_decision`; preserve `run_correction(...) -> CorrectionResponse`.

- [ ] Write tests proving confident no skips `complete_json`, confident yes supplies the category, and uncertain/error calls the current generator.
- [ ] Run the focused correction tests; expect failure.
- [ ] Add the smallest guard before `_call_turn_correction`; retain `check_spend_cap` and response schema.
- [ ] Run focused tests, then `cd backend && python -m pytest tests/domain/correction -q`.
- [ ] Commit `feat: gate Langy corrections with Jev`.
