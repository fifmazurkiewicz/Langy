# Local setup

## Prerequisites

- Python 3.12+
- Node.js 20+
- Postgres (local) **or** Supabase Cloud dev project

## 1. Environment

```bash
cp .env.example .env
cp frontend/.env.example frontend/.env.local
```

Fill Supabase + OpenRouter + Google keys when wiring voice/AI.

For UI-only dev without Supabase, leave `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` empty **and**
set `DEV_AUTH_ENABLED=true` with an empty `SUPABASE_URL` in `.env`. The API rejects `dev-token` without that opt-in —
that is deliberate, since the flag is what keeps production from accepting it (see
`docs/technical/decisions/2026-08-28-session-gate-and-dev-auth.md`).

## 2. Database

Apply `supabase/migrations/001_initial.sql` in Supabase SQL editor, **or** locally:

```bash
cd backend
python -m pip install -r requirements.txt
# set DATABASE_URL in .env (Postgres)
python -m scripts.create_tables
```

## 3. Backend

```bash
cd backend
uvicorn app.main:app --reload --port 8000
curl http://localhost:8000/api/health
```

## 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 — Login (dev) → Onboarding → Chat / Memo / Menu.

## 5. Smoke test

1. Health returns `{"status":"ok"}`
2. Complete onboarding (en-GB)
3. Start Chat session → toggle Listening → End session
4. Memo → Pending → Accept/Reject

## 6. Supabase OAuth redirect URLs

Add to Supabase → Authentication → URL Configuration → **Redirect URLs**:

- `https://langy.fmazurkiewicz.dev/auth/callback`
- `http://localhost:3000/auth/callback` (local)

## 7. Production alignment

- Frontend: Vercel (`langy.fmazurkiewicz.dev`)
- Backend: Render Docker (`api-langy.fmazurkiewicz.dev`)
- `DATABASE_URL` via Supavisor pooler on Render
- `SPEND_CAP_TZ=Europe/Warsaw`
