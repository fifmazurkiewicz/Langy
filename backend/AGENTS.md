# Langy backend

FastAPI on Render Docker. Postgres via `DATABASE_URL`. Do not store durable state on disk.

```bash
python -m pip install -r requirements.txt
python -m scripts.create_tables
uvicorn app.main:app --reload --port 8000
python -m pytest
npm install && npm run promptfoo
```

Health: `GET /api/health` (liveness), `GET /api/health/ready` (DB). Env names: `docs/technical/configuration.md`.
