# Langy — agent notes

## Stack (must match deployment standard)

| Layer | Platform |
|---|---|
| Frontend | **Vercel** (Next.js PWA, greenfield) |
| Backend | **Render** (FastAPI / Docker) |
| Database + Auth | **Supabase** (Postgres, Google OAuth, RLS) |

Voice/text: OpenRouter + Gemini Live (env `VOICE_MODE`). Langfuse Cloud = prompt SoT. No Redis in MVP. Domains: `langy` / `api-langy`.fmazurkiewicz.dev — see `docs/architecture-for-cursor.md`.

## Commands

```bash
# Backend
cd backend && python -m pip install -r requirements.txt
cd backend && python -m scripts.create_tables   # local Postgres/SQLite dev
cd backend && uvicorn app.main:app --reload --port 8000
cd backend && python -m pytest
cd backend && npm install && npm run promptfoo   # mock provider, no API keys

# Frontend
cd frontend && npm install && npm run dev
cd frontend && npm run lint && npm run build

# Health: GET http://localhost:8000/api/health
```

Local dev without Supabase: frontend uses `dev-token`; backend accepts `Authorization: Bearer dev-token`.

## Docs map

| Path | Role |
|---|---|
| `docs/architecture-for-cursor.md` | Business + technical architecture (authoritative for build) |
| `docs/ux/` | UX/UI spec, decisions, screens, design system |
| `docs/business/` | Business-only artifacts (to be filled) |
| `docs/technical/` | Local setup, ADRs, technical deltas |

## Graft + Superpowers

- **Superpowers:** process skills before action (global `superpowers.mdc`). Creative work → brainstorming → writing-plans.
- **Graft:** before broad exploration `graft map` / `graft ask "…" --source` (or MCP). Cache in `/graft/` (gitignored). Wiring: `.cursor/rules/graft.mdc`, `.cursor/mcp.json`. On this machine full `graft` CLI install may need VS C++ build tools.

## Learned User Preferences

- Keep Superpowers mandatory in this repo; Graft and Superpowers belong in global Cursor rules so new repos get them immediately.
- Greenfield build: no FreeLingo fork; upstream/clone for reference only. Do not write feature code until scaffold + relevant plan Task 0 pass.
- Native language is always Polish; English is the primary language to learn, with multi-language support from the start; Polish mid-chat only when the user explicitly asks.
- Language change must be a single control that updates context everywhere; Classical language markers (e.g. GB/DE), not emoji flags.
- Motivation and interests are per target language; the motivation interview depends on the active language; Chat uses Interests only softly (opening = varied “what to talk about / learn?” with no Interests listed; soft suggestions only if silent or unsure).
- Users can accept or reject extracted words; the agent may save a word to flashcards when the user asks; flashcard export to `.txt` as Quizlet paste: `term<TAB>definition` with newline between cards.
- Monthly spend_cap is admin-configurable and sums TTS + ASR + gen AI; when exceeded, block costly actions for the rest of the month but allow browsing and reviewing existing flashcards.
- Chat listening is an optional on/off toggle (on = VAD hands-free; off = mic idle), not push-to-talk or a mandatory Tap-to-start flow.
- User manages global memory in Menu → Memory (view, edit, delete facts).
- Bottom nav is Chat / Memo / Menu; Words renamed to Memo with sub-tabs Flashcards, Shadowing, and Mnemonics.
- Shadowing: agent asks topic, then generated dialogue or pick past conversation; show-text on/off before session (default on); audio TTS|Live switch; tip + optional Add during session and hard-line batch at end → Pending (`shadowing`).
- Mnemonics: library tab for accepted terms without association → Generate; Regenerate costs GenAI cap; Due card has Mnemonic shortcut (same panel); no images, no user-owned mnemonics.
- Coach packages build order: 1 interactive transcript + selection dictionary → 2 in-flight correction → 4 shadowing → 3 mnemonics (GenAI on demand; no images; no user-owned mnemonics).

## Learned Workspace Facts

- Langy is **greenfield** (FastAPI + Next.js PWA); FreeLingo is reference-only, not a fork. ADR: `docs/technical/decisions/2026-08-27-greenfield-no-freelingo-fork.md`.
- Supabase RLS (`006_rls_policies.sql`, idempotent) enforces per-user access on all user tables; `jobs` admin-only; Render backend bypasses RLS via direct SQLAlchemy (defense in depth for direct Supabase client).
- FSRS / spaced-repetition state must persist in Supabase Postgres (not process memory) across Render idle/cold starts.
- Langfuse Cloud is the runtime prompt SoT (tracing, cost, prompt management); seven promptfoo suites in `backend/promptfoo/suites/` with Python mock provider gate CI (`npm run promptfoo`, no API keys).
- Pending vocab never auto-expires; Accept/Reject lives in Memo → Flashcards Pending (not end-of-chat); sources include `transcript_selection`, correction, `shadowing`, `lesson`, and chat extraction.
- Global user memory (lasting facts + session summaries) updates after End session with the vocab-extraction job wave; agenda injects up to 50 facts and the last 3 summaries.
- Default new-user `spend_cap_usd` is 10 per calendar month (Europe/Warsaw).
- `VOICE_MODE` switches `speech_to_speech` (Gemini Live via `POST /api/chat/live-token` ephemeral token + `useGeminiLive`, Web Speech fallback) vs `chained` (via Render); Render Free cold start is accepted with a Chat “Waking up…” state; async jobs use Postgres (no Redis in MVP).
- Optional CEFR placement + study plan (4/8/12/16 weeks) + lessons via Menu → Plan; Skip OK; lesson vocab → Pending `lesson`. Skills 1–5 and CEFR stay separate.
- Chat transcript is always visible in-session; select word/span/sentence → Translate (PL + example) or Add to learning → Pending (`transcript_selection`); Add also available from the translate panel.
- In-flight correction: auto after user turn for substantive errors only, plus on-demand Check; tip + optional Add → Pending; Live runs parallel with agent reply; chained runs after STT before LLM.
- Memo hosts Flashcards (former Words: Due / Categories / Pending / export), Shadowing (line-by-line practice), and Mnemonics (sound-association library + Due shortcut).
