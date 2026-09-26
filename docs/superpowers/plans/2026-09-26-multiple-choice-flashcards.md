# Multiple-choice Flashcards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let learners answer due flashcards by choosing one Polish meaning from four mixed accepted-vocabulary options.

**Architecture:** Reuse `GET /api/vocab/accepted` as the distractor pool and add the owning vocabulary ID to the existing due-card payload. A small pure frontend helper builds unique, shuffled choices. The Memo page owns the temporary quiz state and reuses the existing FSRS review request.

**Tech Stack:** Next.js/React, TypeScript, Vitest, FastAPI, SQLAlchemy.

**Spec:** `docs/superpowers/specs/2026-09-26-multiple-choice-flashcards-design.md`

## Global Constraints

- Do not create tables, endpoints, dependencies, or AI calls.
- Distractors must be accepted vocabulary from the active language and may cross categories.
- Preserve normal Reveal review and the existing FSRS API contract.
- Use native buttons and existing Classical UI tokens.

## Review Focus

- Duplicate Polish translations must not result in two visually identical answer choices.
- A pool with fewer than three valid distractors must show a recoverable message, not a malformed quiz.
- The answer must be checked against `vocab_id`, not against an ambiguous translation string.
- A user must not submit multiple ratings after choosing an answer.
- Changing language or leaving the card must discard the previous quiz state.

### Task 1: Return the due card's vocabulary ID

**Files:**
- Modify: `backend/app/api/routes/vocab.py`
- Test: `backend/tests/api/test_vocab_categories.py`

**Interfaces:**
- Produces: `GET /api/vocab/due` cards with `vocab_id: string`.

- [x] **Step 1: Add an API assertion**

```python
assert result["cards"][0]["vocab_id"] == str(vocab_item.id)
```

- [x] **Step 2: Return `str(c.vocab_item.id)` as `vocab_id` in each due-card object.**

- [x] **Step 3: Run the focused backend test**

Run: `cd backend && python -m pytest tests/api/test_vocab_categories.py -q`

### Task 2: Build and test local quiz choices

**Files:**
- Create: `frontend/src/lib/memo/multipleChoice.ts`
- Create: `frontend/src/lib/memo/multipleChoice.test.ts`

**Interfaces:**
- Produces: `buildMultipleChoiceOptions(correct, vocabulary, random?)` returning four distinct `QuizOption`s or `[]`.

- [x] **Step 1: Write tests for a shuffled correct option, duplicate translations, and insufficient distractors.**

```ts
expect(buildMultipleChoiceOptions(correct, vocabulary, () => 0)).toHaveLength(4);
```

- [x] **Step 2: Implement a pure distinct-distractor and Fisher-Yates shuffle helper.**

- [x] **Step 3: Run the focused Vitest file**

Run: `cd frontend && npm test -- src/lib/memo/multipleChoice.test.ts`

### Task 3: Add the Memo multiple-choice review path

**Files:**
- Modify: `frontend/src/lib/api/vocab.ts`
- Modify: `frontend/src/app/memo/page.tsx`

**Interfaces:**
- Consumes: Due cards with `vocab_id` and `buildMultipleChoiceOptions`.
- Produces: A Multiple choice action, feedback state, and a single Next submission using `good` or `again`.

- [x] **Step 1: Extend the due-card client type with `vocab_id`.**

- [x] **Step 2: Fetch accepted vocabulary when Multiple choice starts and render four native answer buttons.**

- [x] **Step 3: Disable answer buttons after selection, announce feedback, and reuse `reviewCard` on Next.**

- [x] **Step 4: Run checks**

Run: `cd frontend && npm run lint && npm test && npm run build`

- [ ] **Step 5: Commit and push the focused files to `main`.**
