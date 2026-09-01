# Voice env (TTS provider + STT endpointing)

**Date:** 2026-09-01

## Problem

- Shadowing TTS = browser `speechSynthesis` only; no env-configurable voice (ElevenLabs etc.).
- Shadowing STT = Web Speech one-shot (`continuous: false`) → cuts on first pause mid-sentence.

## SOTA context (phone bots)

Production voice bots use **streaming STT + ML endpointing** (Deepgram utterance-end, AssemblyAI turn detection, Google `speech_adaptation`), not fixed silence timers alone. Timers are a **dev/MVP fallback** — acceptable locally, not SOTA.

Langy MVP: keep Web Speech; improve with **longer debounced silence** (`STT_END_SILENCE_MS`) + **manual Stop** until provider STT lands in `VOICE_MODE=chained`.

## Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-09-01 | `TTS_PROVIDER=browser\|elevenlabs` + `TTS_VOICE_ID` + `ELEVENLABS_API_KEY` | Env-driven voice without UI picker yet |
| 2026-09-01 | `TTS_VOICE_NAME` for browser substring match | Free local dev voice tuning |
| 2026-09-01 | `STT_END_SILENCE_MS` (default 2500) exposed via `GET /api/voice/config` | Shadowing longer lines without provider STT |
| 2026-09-01 | Custom voice (`tts_voice_key=custom` + `tts_custom_voice_id`) | User-owned ElevenLabs IDs from Voice Library |

## Env

```
TTS_PROVIDER=browser
TTS_VOICE_ID=
TTS_VOICE_NAME=
ELEVENLABS_API_KEY=
STT_END_SILENCE_MS=2500
```

## API

- `GET /api/voice/config` → `{ tts_provider, tts_configured, tts_voice_name?, stt_end_silence_ms }`
- `POST /api/shadowing/sessions/{id}/tts` → browser hint or `audio_base64` + `content_type`

## GWT

- Given `TTS_PROVIDER=elevenlabs` + key + voice id, when shadowing replays line, then FE plays MPEG from API.
- Given `TTS_PROVIDER=browser`, when replay, then FE uses `speechSynthesis` with optional `TTS_VOICE_NAME` match.
- Given user holds Speak on long line, when they pause < `STT_END_SILENCE_MS`, then recording continues; Stop commits immediately.
