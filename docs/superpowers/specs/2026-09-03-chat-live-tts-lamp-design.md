# Chat Live vs TTS lamp — design (2026-09-03)

## Problem

Chat voice path is driven only by server `VOICE_MODE`. Learners cannot pick **Gemini Live** vs a fully independent **TTS** path on the chat screen. Shadowing already has TTS|Live; Chat needs a lighter control.

## Goals

- Header lamp (left): **ON (lit) = Live Gemini**, **OFF = TTS only**.
- TTS path never opens Live (`live-token` / connect / PCM).
- Persist preference in `localStorage`.
- Switch mid-session: OFF disconnects Live immediately; ON reconnects when Tutor voice is on.

## Non-goals

- Profile/server sync of this preference.
- Changing Tutor voice / Listening / respeak semantics.
- Removing env `VOICE_MODE` (still caps Live availability when `chained`).

## Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-09-03 | Approach: FE preference gates Live | Smallest change; TTS fully independent |
| 2026-09-03 | Lamp left of language switcher in Chat header | Always visible; matches Classical chrome |
| 2026-09-03 | Lit = Live, unlit = TTS | User metaphor |
| 2026-09-03 | `localStorage` key `langy-chat-live-gemini` | Persist across visits without backend |
| 2026-09-03 | Default ON (Live) | Matches production `speech_to_speech` default |
| 2026-09-03 | Mid-session toggle allowed | Immediate path switch |

## Architecture

- `readLiveGeminiPreference` / `writeLiveGeminiPreference` + storage key helper.
- `LiveGeminiLamp` button: hit target ≥44px, lit = accent fill/glow, unlit = dark/divider; `aria-pressed` + name “Live Gemini”.
- Chat page: `liveGemini` state; `connectLive` no-ops when false; tutor-voice effect also requires `liveGemini`; toggle OFF → `disconnect` + `cancelSpeech`.

## Given / When / Then

1. **Given** lamp ON and Tutor voice on, **When** session is active, **Then** Chat may connect Gemini Live.
2. **Given** lamp OFF, **When** session is active, **Then** no Live connect/token; turns use text-turn/chained + TTS for tutor audio.
3. **Given** Live connected, **When** user turns lamp OFF, **Then** Live disconnects immediately and further turns stay on TTS path.
4. **Given** preference saved in localStorage, **When** user revisits Chat, **Then** lamp matches saved state.

## Sync

- UX §11.1 Chat chrome: Live/TTS lamp in header.
- Working plan: `.cursor/plans/2026-09-03-chat-live-tts-lamp.md`.
