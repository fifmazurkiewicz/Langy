# Shadowing conversation preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Past-chat picker in Shadowing shows a scrollable accordion of the last ~10 transcript lines so users can recognize conversations.

**Architecture:** Add `snippet_lines()` next to `parse_transcript`; expose on `GET /api/shadowing/conversations`; accordion UI in `ShadowingFlow` step `past`.

**Tech Stack:** FastAPI, existing transcript helpers, Next.js React client component.

## Global Constraints

- Native UI language: English (product UI).  
- Classical design tokens only (`classical-card`, etc.).  
- No new endpoint; max 10 last lines; one expanded card.

---

### Task 1: Backend snippet helper + list payload

**Files:**
- Modify: `backend/app/domain/chat/transcript.py`
- Modify: `backend/app/domain/chat/__init__.py`
- Modify: `backend/app/api/routes/shadowing.py`
- Test: `backend/tests/domain/chat/test_transcript.py`
- Test: `backend/tests/api/test_shadowing_conversations_list.py` (create)

**Interfaces:**
- Produces: `snippet_lines(transcript: str | None, limit: int = 10) -> list[dict[str, str]]`
- Produces: list item field `snippet_lines: list[{role, text}]`

- [ ] **Step 1:** Failing tests for last-N lines + empty + list route field  
- [ ] **Step 2:** Implement helper + wire into `list_conversations`  
- [ ] **Step 3:** `pytest` green  

### Task 2: Frontend accordion picker

**Files:**
- Modify: `frontend/src/lib/api/shadowing.ts`
- Modify: `frontend/src/components/shadowing/ShadowingFlow.tsx`
- Docs delta: `docs/ux/ux-ui-spec.md` (one line under Shadowing) if needed  

- [ ] **Step 1:** Extend conversation type with `snippet_lines`  
- [ ] **Step 2:** Accordion: select + expand one; scrollable last lines; empty copy  
- [ ] **Step 3:** `npm test` / lint as available  

### Task 3: Converge docs

- [ ] Sync ADR/decision one-liner in design Decisions (already in spec)  
- [ ] Optional plan mark-complete in `.cursor/plans/` only if creating working plan there  

---
