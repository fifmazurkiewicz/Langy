# Configuration (env names)

Placeholders only. Copy `.env.example` → `.env` and `frontend/.env.example` → `frontend/.env.local`. Never commit real keys. How to run: [local-setup.md](./local-setup.md).

## Backend (Render / local `.env`)

| Name | Purpose |
|---|---|
| `SUPABASE_URL` | Project URL; JWKS on Render. Empty + `DEV_AUTH_ENABLED=true` enables local `dev-token`. |
| `SUPABASE_ANON_KEY` | Frontend-style anon key (template). |
| `SUPABASE_SERVICE_ROLE_KEY` | Server role key (template). |
| `SUPABASE_JWT_SECRET` | Optional legacy HS256; unused when JWKS via `SUPABASE_URL`. |
| `DEV_AUTH_ENABLED` | Accept `dev-token` / unsigned JWTs. **Never** set on Render. Ignored when `SUPABASE_URL` is set. |
| `DATABASE_URL` | Postgres. Local: `localhost:5432`. Render: Supavisor pooler (not `db.<ref>.supabase.co`). |
| `REDIS_URL` | Optional; not required for MVP (Postgres jobs). |
| `SPEND_CAP_TZ` | Calendar month for spend cap (`Europe/Warsaw`). |
| `ALLOWED_ADMIN_EMAILS` | Comma-separated admin allowlist. |
| `TEXT_PROVIDER` | Text LLM adapter (`openrouter`). |
| `TEXT_MODEL` | OpenRouter slug (default `google/gemini-2.5-flash`). |
| `OPENROUTER_API_KEY` | OpenRouter. |
| `VOICE_MODE` | `speech_to_speech` (Gemini Live) or `chained`. |
| `GOOGLE_API_KEY` | Gemini Live / Google. |
| `TTS_PROVIDER` | `elevenlabs` (product) or `browser`. |
| `TTS_VOICE_ID` | ElevenLabs voice id. |
| `TTS_VOICE_NAME` | Optional browser-voice substring. |
| `ELEVENLABS_API_KEY` | ElevenLabs. |
| `STT_END_SILENCE_MS` | Web Speech pause before commit (ms). |
| `LANGFUSE_PUBLIC_KEY` | Langfuse Cloud. |
| `LANGFUSE_SECRET_KEY` | Langfuse Cloud. |
| `LANGFUSE_HOST` | Langfuse host (`https://cloud.langfuse.com`). |
| `PROMPTFOO_API_KEY` | Optional; CI mock provider does not need it. |

Chained voice may also use `STT_PROVIDER` (commented in `.env.example`).

## Frontend (Vercel / `frontend/.env.local`)

| Name | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | API base (local default `http://localhost:8000`; prod `https://api-langy.fmazurkiewicz.dev`). |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL. Empty with empty anon key → UI `dev-token`. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key. |

Production values live in Vercel / Render dashboards, not in git.
