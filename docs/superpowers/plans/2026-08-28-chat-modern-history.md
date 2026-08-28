# Chat modern UI + history — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement task-by-task.

**Goal:** Modern voice-first Chat UI with conversation history (preview + resume).

**Architecture:** Backend adds `parse_transcript`, `GET /conversations`, `POST /resume` on existing `conversations` table. Frontend refactors `chat/page.tsx` into Classical components + `lib/api/chat.ts`.

**Tech Stack:** FastAPI, SQLAlchemy, Next.js, Classical CSS tokens.

## Global Constraints

- UI copy in English; Classical design (Cormorant/Lora, gold accent, no emoji flags).
- Transcript always visible in active session.
- Resume reopens same `conversation_id` (`ended_at = null`).
- Touch targets ≥ 44px; safe-area on fixed bottom UI.

---

- [ ] **Task 1:** `domain/chat/transcript.py` + unit tests
- [ ] **Task 2:** `GET /api/chat/conversations`, `POST /resume`, fix shadowing import
- [ ] **Task 3:** `api/test_chat_routes.py` auth tests
- [ ] **Task 4:** `lib/api/chat.ts` + `lib/chat/transcript.ts`
- [ ] **Task 5:** New chat UI components (orb, stage, control bar, sheets)
- [ ] **Task 6:** Refactor `chat/page.tsx`, `LanguageSwitcher`, `TranscriptPane`
- [ ] **Task 7:** `pytest` + `npm run build`
