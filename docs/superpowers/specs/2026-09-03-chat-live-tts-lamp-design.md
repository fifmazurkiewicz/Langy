# Chat Live vs TTS lamp — design (2026-09-03)

## Problem

Chat voice path is driven only by server `VOICE_MODE`. Learners cannot pick **Gemini Live** vs a fully independent **TTS** path on the chat screen. Shadowing already has TTS|Live; Chat needs a lighter control.

## Goals

- Status-row lamp (left of waves/title): **ON (lit) = Live Gemini**, **OFF = TTS only**.
- TTS path never opens Live (`live-token` / connect / PCM).
- Persist preference in `localStorage`.
- Switch mid-session: OFF disconnects Live immediately; ON reconnects when Tutor voice is on.

## Non-goals

- Profile/server sync of this preference.
- Changing Tutor voice / Listening chrome (dots stay as user preference).
- Removing env `VOICE_MODE` (still caps Live availability when `chained`).

## Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-09-03 | Approach: FE preference gates Live | Smallest change; TTS fully independent |
| 2026-09-03 | Lamp left of language switcher in Chat header | Always visible; matches Classical chrome |
| 2026-09-04 | Lamp + Tutor/Listening dots on locked status row (not header); only transcript scrolls | User: waves + status + dots one level; header = language + History only |
| 2026-09-03 | Lit = Live, unlit = TTS | User metaphor |
| 2026-09-03 | `localStorage` key `langy-chat-live-gemini` | Persist across visits without backend |
| 2026-09-03 | Default ON (Live) | Matches production `speech_to_speech` default |
| 2026-09-03 | Mid-session toggle allowed | Immediate path switch |
| 2026-09-03 | Suspend Listening recognition during chat TTS/respeak | Avoid capturing tutor audio |
| 2026-09-03 | Suspend Listening during Live PCM until turnComplete + idle | Same echo bug on Live path (previous fix only wrapped speakTutorLine) |
| 2026-09-03 | AgentPresence + ChatStatus scroll with transcript | Presence was sticky above scroll; user needs it to move with chat |
| 2026-09-04 | AgentPresence + ChatStatus + voice dots locked above transcript | Supersedes scroll-with-transcript; user wants fixed chrome, scroll-only messages |

## Architecture

- `readLiveGeminiPreference` / `writeLiveGeminiPreference` + storage key helper.
- `LiveGeminiLamp` button: hit target ≥44px, lit = accent fill/glow, unlit = dark/divider; `aria-pressed` + name “Live Gemini”.
- Chat status row: lamp left, compact AgentPresence + status title center, Tutor/Listening dots right; transcript is the only scroll surface.
- Chat page: `liveGemini` state; `connectLive` no-ops when false; tutor-voice effect also requires `liveGemini`; toggle OFF → `disconnect` + `cancelSpeech`.
- `withMicSuspended` + `micSuspended` gate around chat `speakTutorLine` (respeak / TTS path); browser TTS awaits utterance end.

## Given / When / Then

1. **Given** lamp ON and Tutor voice on, **When** session is active, **Then** Chat may connect Gemini Live.
2. **Given** lamp OFF, **When** session is active, **Then** no Live connect/token; turns use text-turn/chained + TTS for tutor audio.
3. **Given** Live connected, **When** user turns lamp OFF, **Then** Live disconnects immediately and further turns stay on TTS path.
4. **Given** preference saved in localStorage, **When** user revisits Chat, **Then** lamp matches saved state.

5. **Given** lamp ON and Listening on, **When** learner taps Agent speaker (respeak), **Then** recognition is suspended until TTS ends and does not submit the tutor line as user speech.
6. **Given** lamp ON, Listening on, and Live connected, **When** tutor audio plays, **Then** recognition is suspended until turn complete and PCM idle so tutor speech is not submitted as a user turn.
7. **Given** an active Chat session with transcript, **When** the learner scrolls the transcript, **Then** only messages move; header, status row (lamp + waves + title + voice dots), composer, and bottom nav stay fixed.

## Sync

- UX §11.1 Chat chrome: five locked zones; Live/TTS lamp + voice dots on status row; only transcript scrolls; respeak and Live playback suspend Listening recognition.
- Working plan: `.cursor/plans/2026-09-03-chat-live-tts-lamp.md`.
