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

Fill Supabase + OpenRouter + Google keys when wiring voice/AI. For UI-only dev, leave Supabase empty — app uses dev auth.

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

## 6. Production alignment

- Frontend: Vercel (`langy.fmazurkiewicz.dev`)
- Backend: Render Docker (`api-langy.fmazurkiewicz.dev`)
- `DATABASE_URL` via Supavisor pooler on Render
- `SPEND_CAP_TZ=Europe/Warsaw`
