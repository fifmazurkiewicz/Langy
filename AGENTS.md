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
cd frontend && npm run lint && npm test && npm run build

# Health: GET http://localhost:8000/api/health
```

Local dev without Supabase: leave `NEXT_PUBLIC_SUPABASE_*` empty so the frontend sends `dev-token`, and set
`DEV_AUTH_ENABLED=true` (with empty `SUPABASE_URL`) so the backend accepts it. Production rejects `dev-token`.

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

- Keep Superpowers mandatory; Graft and Superpowers belong in global Cursor rules; greenfield — no FreeLingo fork (reference only); no feature code until scaffold + relevant plan Task 0 pass.
- Native language is always Polish; English is the primary language to learn, with multi-language support from the start; Polish mid-chat only when the user explicitly asks.
- Language change must be a single control that updates context everywhere; Classical language markers (e.g. GB/DE), not emoji flags.
- Motivation and interests are per target language; the motivation interview depends on the active language; Chat uses Interests only softly (opening = varied “what to talk about / learn?” with no Interests listed; soft suggestions only if silent or unsure).
- Users can accept or reject extracted words; the agent may save a word to flashcards when the user asks; flashcard export to `.txt` as Quizlet paste: `term<TAB>definition` with newline between cards.
- Monthly spend_cap is admin-configurable and sums TTS + ASR + gen AI; when exceeded, block costly actions for the rest of the month but allow browsing and reviewing existing flashcards.
- Chat always has a text input; Listening is an optional on/off toggle (on = VAD hands-free; off = mic idle) with a speak/mic affordance when off — not push-to-talk or mandatory Tap-to-start; MicStatusBanner (off / blocked / unsupported / listening); Web Speech needs Chrome or Edge (Firefox unsupported; Safari desktop partial, iOS unreliable).
- Menu hub (drill-in per UX §11.3): Languages, Profile (motivation/interests/skills per language), Plan, Memory (view/edit/delete facts), Appearance (System/Light/Dark), optional Admin, Sign out.
- Bottom nav is Chat / Memo / Menu; Memo main tabs Flashcards, Vocabulary, Shadowing; Flashcards sub-tabs Due today (category picker first) / Pending / Generate (renamed from Categories); Vocabulary = all accepted words for active language with local search and Mnemonic per term.
- Shadowing: agent asks topic, then generated dialogue or pick past conversation; show-text on/off before session (default on); audio TTS|Live switch; tip + optional Add during session and hard-line batch at end → Pending (`shadowing`).
- Mnemonics: Generate/Regenerate via Mnemonic button on Vocabulary and Due cards (same panel); no images, no user-owned mnemonics.
- Coach packages build order: 1 interactive transcript + selection dictionary → 2 in-flight correction → 4 shadowing → 3 mnemonics (GenAI on demand; no images; no user-owned mnemonics).

## Learned Workspace Facts

- Langy is **greenfield** (FastAPI + Next.js PWA); FreeLingo is reference-only, not a fork. ADR: `docs/technical/decisions/2026-08-27-greenfield-no-freelingo-fork.md`.
- Supabase RLS (`006_rls_policies.sql`, idempotent) enforces per-user access on all user tables; `jobs` admin-only; Render backend bypasses RLS via direct SQLAlchemy (defense in depth for direct Supabase client).
- FSRS / spaced-repetition state must persist in Supabase Postgres (not process memory) across Render idle/cold starts.
- Langfuse Cloud is the runtime prompt SoT (tracing, cost, prompt management); seven promptfoo suites in `backend/promptfoo/suites/` with Python mock provider gate CI (`npm run promptfoo`, no API keys).
- Pending vocab never auto-expires; Accept/Reject in Memo → Flashcards Pending (`category_generated` badges show topic name, e.g. travel, not generic Category); sources include `transcript_selection`, correction, `shadowing`, `lesson`, and chat extraction. Global user memory (facts + session summaries) updates after End session with the vocab-extraction job wave; agenda injects up to 50 facts and the last 3 summaries.
- Default new-user `spend_cap_usd` is 10 per calendar month (Europe/Warsaw).
- `VOICE_MODE` switches `speech_to_speech` (Gemini Live via ephemeral token + `useGeminiLive`, Web Speech fallback) vs `chained` (via Render). Global `ApiPulseProvider` polls `GET /api/health` (5 s waking / 30 s healthy) with `ApiPulseBanner`; optional `GET /api/health/ready` (DB, 503 degraded). Async jobs use Postgres (no Redis in MVP).
- Default `TEXT_MODEL` is `google/gemini-2.5-flash` on OpenRouter; deprecated slugs (e.g. `gemini-2.0-flash-001`) return 404 — set explicitly in Render env after deploy.
- Onboarding wizard: multi-language pick, per-language motivation/interests/skills (CEFR A1–C2 labels, not numeric 1–5), optional CEFR plan (4/8/12/16 weeks) + lessons via Menu → Plan; Skip OK; explicit active-language choice; users with no language profiles must be guided to setup (not stuck on “Loading profile…”).
- Chat: transcript always visible in-session; select → Translate (PL + example) or Add → Pending (`transcript_selection`); in-flight correction auto on substantive errors + on-demand Check (Live parallel, chained after STT); History sheet lists past sessions (preview), Resume reopens the same `conversation_id`, and supports per-session delete.
- New interests added in Menu → Profile create flashcard sets and enqueue category vocab generation jobs for new interests only.
- Langy production is live on Supabase + Render + Vercel + Cloudflare; Render Root Directory `backend`, Runtime Docker (never `Docker` as root); Cloudflare `api-langy` CNAME to Render DNS-only, `langy` CNAME to Vercel — separate records; Google OAuth callback `/auth/callback` with server-side PKCE exchange (not client-side on `/`).
