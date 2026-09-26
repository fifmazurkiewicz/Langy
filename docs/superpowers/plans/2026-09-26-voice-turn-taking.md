# Voice Turn Taking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a learner who speaks slowly finish a thought before Langy replies, prevent one spoken turn from being sent twice, and treat audible self-corrections as successful communication.

**Architecture:** The browser owns microphone lifecycle and duplicate prevention. It waits for the server-provided silence duration, stops recognition before submitting, and resumes only when the tutor turn has finished. A narrow Jev decision may defer an apparently incomplete utterance after the silence window; it fails open and has a hard maximum wait. Tutor and correction prompts treat “she see—sees a whale” as the learner’s successful self-correction.

**Tech Stack:** Next.js/TypeScript, Web Speech API, FastAPI/Pydantic, OpenRouter Jev Decisions, pytest, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-03-tutor-listening-space-design.md` (behavioural base) plus the user-approved turn-taking requirements from 2026-09-26.

## Global Constraints

- Keep `OPENROUTER_API_KEY` server-side; never expose it to the browser.
- Favour a learner’s extra thinking time over an immediate tutor reply.
- Jev is advisory only: network failure, low confidence, or timeout preserves normal submission.
- A deliberate repeated sentence after a completed tutor response remains possible.
- No new dependency; preserve Chrome/Edge Web Speech fallback behaviour.
- Tutor turns stay concise and leave space for learner speech.

## Review Focus

- A pause shorter than the configured silence duration never sends a turn.
- The same recognition cycle cannot send a second turn while the first response is pending or TTS is playing.
- The same sentence spoken after a completed tutor response is accepted as a new exercise repetition.
- Jev saying “incomplete” delays one response but cannot leave listening stuck forever.
- A self-correction is not flagged or followed by a repetition request solely because of the abandoned word.

---

### Task 1: Reliable browser turn boundary

**Files:**

- Modify: `frontend/src/lib/voice/webSpeechTurn.ts`
- Modify: `frontend/src/lib/voice/webSpeechTurn.test.ts`
- Modify: `frontend/src/app/chat/page.tsx`

**Interfaces:**

- Change `bindDebouncedContinuousRecognition(recognition, onUtterance)` to accept the server-provided silence duration.
- The callback is invoked at most once for each active recognition instance.

- [ ] **Step 1: Write failing Vitest cases**

Add tests that pass `2500` as the silence duration and prove no callback occurs at 2499 ms, one occurs at 2500 ms, and later `onresult` events from the same recognition instance cannot create another callback after submission.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- webSpeechTurn.test.ts`

Expected: FAIL because the helper has a hard-coded 1500 ms window and no committed-turn guard.

- [ ] **Step 3: Implement the minimal recognition guard**

Make the helper take a bounded `silenceMs`, retain the current browser event’s final/interim text, and set a `committed` flag before invoking the callback. Cleanup cancels the timer and invalidates late events.

- [ ] **Step 4: Stop capture before submitting**

In the continuous-recognition callback in `frontend/src/app/chat/page.tsx`, immediately unbind and stop that recognition instance before `submitUserMessage`. Make recognition inactive while `sending` is true, so React cannot start another recognizer during the HTTP request or TTS handoff. Resume only after the tutor turn finishes.

- [ ] **Step 5: Run focused frontend tests**

Run: `cd frontend && npm test -- webSpeechTurn.test.ts`

Expected: PASS.

### Task 2: Advisory Jev completion decision

**Files:**

- Modify: `backend/app/domain/correction/jev.py`
- Modify: `backend/app/api/routes/voice.py`
- Modify: `backend/tests/domain/correction/test_jev.py`
- Modify: `backend/tests/api/test_voice_routes.py`
- Modify: `frontend/src/lib/api/voice.ts`
- Modify: `frontend/src/app/chat/page.tsx`

**Interfaces:**

- Add `turn_completion_decision(text: str, language: str) -> dict | None`, returning `likely_complete` and confidence.
- Add an approved-user `POST /api/voice/turn-decision` with typed request and `{likely_complete: bool | null}` response.

- [ ] **Step 1: Write failing backend tests**

Mock the Decisions transport for high-confidence complete/incomplete results, malformed data, and a timeout. Assert failures return `None`/`likely_complete: null`, never a blocking incomplete answer.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/domain/correction/test_jev.py tests/api/test_voice_routes.py -q`

Expected: FAIL because the completion decision and route do not exist.

- [ ] **Step 3: Add the smallest server-side Jev decision**

Reuse the existing Decisions client and pinned Jev model. Ask only whether the transcribed learner utterance is likely a complete conversational turn; treat fillers, mid-sentence pauses, and self-repairs as potentially incomplete. Use a short bounded request and return `null` on uncertainty or failure.

- [ ] **Step 4: Use Jev conservatively in Chat**

After the configured silence window, call the route only for hands-free Web Speech. Submit immediately on `true` or `null`; on a confident `false`, keep listening for one additional bounded window, then submit the accumulated text regardless. Ignore obsolete responses after newer speech or session close.

- [ ] **Step 5: Run focused tests**

Run: `cd backend && python -m pytest tests/domain/correction/test_jev.py tests/api/test_voice_routes.py -q && cd ../frontend && npm test -- webSpeechTurn.test.ts`

Expected: PASS.

### Task 3: Conversational self-repair prompt and regression coverage

**Files:**

- Modify: `backend/app/domain/voice/soft_brevity.py`
- Modify: `backend/app/domain/correction/service.py`
- Modify: `backend/tests/domain/voice/test_live_token.py`
- Modify: `backend/tests/domain/correction/test_correction_service.py`

**Interfaces:**

- `build_live_system_instruction(...)` includes a self-repair rule for Live and text/chained tutor turns.
- The correction prompt distinguishes an abandoned word from a remaining substantive error.

- [ ] **Step 1: Write failing prompt assertions**

Assert that the tutor instruction accepts an immediate self-correction without demanding a repeat and the correction prompt analyses final intended wording, not the abandoned fragment.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/domain/voice/test_live_token.py tests/domain/correction/test_correction_service.py -q`

Expected: FAIL because neither prompt describes self-repairs.

- [ ] **Step 3: Add concise self-repair guidance**

Add one shared tutor rule: learners are not experts; when they immediately correct themselves, respond to the corrected wording and continue naturally instead of demanding a repeat. Add the same rule to the generative correction instruction.

- [ ] **Step 4: Run verification**

Run: `cd backend && python -m pytest tests/domain/voice/test_live_token.py tests/domain/correction/test_correction_service.py -q && cd ../frontend && npm run lint && npm test`

Expected: PASS.

