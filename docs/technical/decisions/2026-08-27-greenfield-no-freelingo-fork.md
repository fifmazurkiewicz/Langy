# ADR — Greenfield build; FreeLingo reference only

**Date:** 2026-08-27  
**Status:** accepted

## Context

Early architecture assumed importing [FreeLingo](https://github.com/ArtCC/freelingo) as an AGPL fork (FastAPI + Next.js scaffold). Langy’s differentiators (Pending queue, spend_cap, Memo IA, coach packages, Gemini Live, Classical UI, Supabase auth, FSRS) dominate the codebase. Fork would require heavy stripping (Redis, Stripe, SM-2, sidebar UX) while inheriting AGPL obligations.

## Decision

- **No FreeLingo fork** in the Langy repo.
- **FreeLingo = reference only** (local clone or upstream for patterns: CEFR grid, lesson types, chat/voice flow ideas).
- **Greenfield scaffold:** `backend/` (FastAPI) + `frontend/` (Next.js PWA) built from `docs/architecture-for-cursor.md` and UX specs.
- Keep/adapt/drop table (`.cursor/plans/2026-08-27-freelingo-keep-adapt-drop.md`) remains valid as a **reference map**, not an import checklist.

## Consequences

- Task 0 in implementation plans = greenfield MVP skeleton (Chat, Pending, spend_cap), not fork import.
- No AGPL obligation from FreeLingo code in Langy (Langy’s own license applies).
- CEFR/plan/lesson generators **reimplemented** from specs; may study FreeLingo algorithms externally.
- Build order §9 unchanged in intent; step 1 becomes scaffold + Supabase wiring, not fork merge.
