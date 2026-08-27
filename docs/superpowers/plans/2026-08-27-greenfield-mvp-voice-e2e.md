# Greenfield MVP Voice E2E Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver architecture §9 steps 1–7: greenfield monorepo, schema + RLS, Classical PWA shell, onboarding, provider layer, English voice Chat E2E, spend cap, post-session extraction + Pending Accept/Reject + agent save-word.

**Architecture:** FastAPI backend (Render Docker) + Next.js PWA (Vercel) + Supabase Postgres/Auth. Browser ↔ Gemini Live when `VOICE_MODE=speech_to_speech`; Render owns JWT, agenda, tools, ledger, async Postgres jobs. FSRS via `py-fsrs` in DB.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy 2, Alembic, pytest, py-fsrs; Next.js 15 App Router, TypeScript, Tailwind, `@supabase/supabase-js`; Langfuse SDK; OpenRouter text provider.

**Spec:** `docs/architecture-for-cursor.md` §3–7, §9 steps 1–7; `docs/ux/ux-ui-spec.md`; `docs/superpowers/specs/2026-08-26-domain-user-journey-design.md`

## Global Constraints

- L1 always Polish — not configurable.
- Product UI copy in English; Polish only in translations / learner L1 content.
- Greenfield — no FreeLingo import.
- `spend_cap_usd` default 10; month TZ `Europe/Warsaw`.
- Pending never auto-expires; `agent_save` → accepted immediately.
- Chat listening = optional on/off toggle; VAD when on.
- Cold API → **Waking up…** in Chat UI.
- Domains: `langy` / `api-langy` .fmazurkiewicz.dev (prod).

---

### Task 1: Backend scaffold + health

**Files:** `backend/` tree, `requirements.txt`, `Dockerfile`, `app/main.py`, `app/api/routes/health.py`

- [ ] FastAPI app with CORS, `/api/health` → `{"status":"ok"}`
- [ ] pytest `test_health.py` passes
- [ ] Dockerfile for Render (ca-certificates, uvicorn)

### Task 2: Config + DB + Alembic initial migration

**Files:** `app/config.py`, `app/db.py`, `alembic/`, `supabase/migrations/001_initial.sql`

- [ ] All tables from architecture §6 (MVP subset: skip lessons/study_plans optional tables stubbed)
- [ ] `jobs` table for Postgres async queue

### Task 3: Auth (Supabase JWT)

**Files:** `app/auth/jwt.py`, `app/auth/deps.py`, `app/api/routes/auth.py`

- [ ] Verify JWT via JWKS; upsert `users` on first login; `is_admin` from `ALLOWED_ADMIN_EMAILS`

### Task 4: Spend cap domain

**Files:** `app/domain/spend_cap/service.py`, tests

- [ ] `check_spend_cap(user_id)`, `record_usage(...)`, block when monthly sum ≥ cap

### Task 5: Onboarding + profile API

**Files:** `app/api/routes/onboarding.py`, `app/api/routes/profile.py`

- [ ] Languages, per-language motivation/interests/skills, `active_language`, `onboarding_completed_at`

### Task 6: Vocab + FSRS + Pending API

**Files:** `app/api/routes/vocab.py`, `app/domain/fsrs/service.py`

- [ ] CRUD Pending Accept/Reject; `agent_save` accepted path

### Task 7: Chat sessions + agenda + jobs

**Files:** `app/api/routes/chat.py`, `app/domain/agenda/service.py`, `app/domain/extraction/service.py`, `app/jobs/worker.py`

- [ ] Start/end session, transcript append, end → enqueue extraction + memory jobs
- [ ] Live token mint endpoint; save-word tool handler

### Task 8: Provider layer

**Files:** `app/domain/providers/text.py`, `voice.py`, Langfuse wiring

- [ ] `TextCompletionProvider` OpenRouter; voice mode switch

### Task 9: Frontend scaffold + PWA + Classical theme

**Files:** `frontend/` Next.js, `src/app/layout.tsx`, bottom nav, fonts/tokens from DS

- [ ] Chat / Memo / Menu tabs; dark mode; manifest + service worker

### Task 10: Frontend auth + onboarding wizard

**Files:** `src/app/auth/`, `src/app/onboarding/`, Supabase client

- [ ] Google OAuth; multi-step onboarding per UX spec

### Task 11: Chat UI + voice adapter

**Files:** `src/app/chat/`, listening toggle, states (Idle/Listening/Thinking/Speaking/Waking up)

- [ ] Gemini Live client when `speech_to_speech`; transcript pane; End session

### Task 12: Memo Pending UI + integration tests

**Files:** `src/app/memo/`, badge, Accept/Reject, source labels

- [ ] E2E smoke: onboarding → chat (mock voice) → end → pending → accept

### Task 13: Docs + env examples + AGENTS.md commands

- [ ] `frontend/.env.example`, update `local-setup.md`, runnable commands in AGENTS.md
