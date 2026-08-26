# Langy — agent notes

## Stack (must match deployment standard)

| Layer | Platform |
|---|---|
| Frontend | **Vercel** (Next.js PWA, from FreeLingo fork) |
| Backend | **Render** (FastAPI / Docker) |
| Database + Auth | **Supabase** (Postgres, Google OAuth, RLS) |

Voice/text: OpenRouter + Gemini Live (env `VOICE_MODE`). Langfuse Cloud = prompt SoT. No Redis in MVP. Domains: `langy` / `api-langy`.fmazurkiewicz.dev — see `docs/architecture-for-cursor.md`.

## Commands

Repo is docs/design-first; app code is not checked in yet. When frontend/backend land:

```bash
# Frontend (expected)
cd frontend && npm install && npm run dev
cd frontend && npm run lint && npm run test && npm run build

# Backend (expected)
cd backend && pip install -r requirements.txt
cd backend && pytest
# health: GET /api/health
```

Until then: no runnable app commands — treat `docs/` as the contract.

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
- Prefer documentation deltas over full rewrites; ignore missing docs unless asked to create them.
- Native language is always Polish; English is the primary language to learn, with multi-language support from the start.
- Language change must be a single control that updates context everywhere; Classical language markers (e.g. GB/DE), not emoji flags.
- Motivation and interests are per target language; the motivation interview depends on the active language.
- Users can accept or reject extracted words; the agent may save a word to flashcards when the user asks.
- Monthly spend_cap is admin-configurable and sums TTS + ASR + gen AI; when exceeded, block costly actions for the rest of the month but allow browsing and reviewing existing flashcards.
- Want flashcard export to `.txt` suitable for pasting into Quizlet.

## Learned Workspace Facts

- `docs/architecture-for-cursor.md` is the authoritative business + technical project description for build work.
- UX/UI specs and decisions live under `docs/ux/`.
- Product is a public free / personal-use language-learning app.
- FSRS / spaced-repetition state must persist in Supabase Postgres (not process memory) across Render idle/cold starts.
- Langfuse covers tracing, cost management, and prompt management; promptfoo is the pre-deploy prompt/eval gate.
