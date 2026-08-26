# Stack, deploy, chat & agents — design (2026-08-26)

Approved in clarification. Synced into `docs/architecture-for-cursor.md` and UX.

## Hosting

| Piece | Choice |
|---|---|
| Frontend | Vercel → `langy.fmazurkiewicz.dev` |
| Backend | Render Free (Docker) → `api-langy.fmazurkiewicz.dev` |
| DB / Auth | Supabase |
| Cold start | Accepted; Chat shows **Waking up…** until API is ready |
| Redis | **Not in MVP** — async jobs via **Postgres** |
| Langfuse | **Cloud**; **runtime SoT for prompts**; repo holds promptfoo fixtures only |
| promptfoo | Pre-deploy / CI against repo fixtures (aligned with Langfuse versions when synced for eval) |

## Voice

- Both modes via env: `VOICE_MODE=speech_to_speech|chained` (default `speech_to_speech`).
- **speech_to_speech:** browser talks to **Gemini Live directly** (short-lived credentials from API); Render = auth, agenda, tools, jobs, ledger.
- **chained:** STT → LLM → TTS **through Render**.
- Mid-chat **save word:** Live **tool/function call** → backend persists `agent_save`.
- Full **transcript** stored in Postgres every session; no audio files in MVP.

## Chat UX (listening)

- **Optional listening toggle** (on/off) — not push-to-talk, not a mandatory per-turn mic button.
- When toggle is **on**: user just speaks; **VAD** drives Listening ↔ Thinking ↔ Speaking until they turn it off or tap **End session**.
- When toggle is **off**: session can still be open (e.g. agent speaking / idle) but mic is not capturing.
- iOS/browser autoplay rules: flipping the toggle **on** is the user gesture that unlocks mic/audio — still a toggle, not a separate forced CTA flow.
- Cold API: **Waking up…** before the toggle is usable.

## Admin

- Sole admin via `ALLOWED_ADMIN_EMAILS=fifmazurkiewicz@gmail.com` (is_admin on login).
