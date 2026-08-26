# Local setup

App code is not in the repo yet (docs / UX mockups only). When frontend and backend land, this checklist must be complete:

1. Copy `.env.example` → `.env` (and `frontend/.env.example` if split) — never commit secrets. Include Langfuse keys when wiring AI ops.
2. Supabase project: Postgres + Google OAuth + RLS.
3. Backend on Render locally: install deps, run API, hit `/api/health`.
4. Frontend on Vercel locally: `npm run dev`, smoke Chat / Words / Menu against mock or API.
5. Confirm stack matches `deployment-standard` and `docs/architecture-for-cursor.md` (§3 / §8). Monthly spend cap TZ: `SPEND_CAP_TZ`.
6. When prompts exist: run promptfoo suites before deploy; traces visible in Langfuse.

Until then: open `docs/ux/screens/*.dc.html` in a browser to review mockups (requires the bundled `support.js` / design-system assets as linked in those files).
