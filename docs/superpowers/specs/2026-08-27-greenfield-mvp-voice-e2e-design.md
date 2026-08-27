# Greenfield MVP Voice E2E — design (2026-08-27)

Approved: user chose **Option C** (architecture §9 steps 1–7).

## Scope

| Step | Deliverable |
|---|---|
| 1 | `backend/` + `frontend/` monorepo, Docker, health |
| 2 | Schema §6 + `jobs` table + RLS SQL |
| 3 | Classical PWA shell — Chat / Memo / Menu |
| 4 | Onboarding wizard (languages, interests, active language) |
| 5 | `TextCompletionProvider` (OpenRouter + mock), voice adapter stub |
| 6 | Chat session + listening toggle + Web Speech dev path; spend cap checks |
| 7 | End session → extraction → Pending Accept/Reject; `agent_save` API |

## Out of this slice

Coach packages (transcript, correction, shadowing, mnemonics), CEFR plan, admin UI, promptfoo CI, production Gemini Live token mint (stub only).

## Dev auth

Without Supabase env: `Bearer dev-token` + frontend dev login for local loop.

**Plan:** `docs/superpowers/plans/2026-08-27-greenfield-mvp-voice-e2e.md`
