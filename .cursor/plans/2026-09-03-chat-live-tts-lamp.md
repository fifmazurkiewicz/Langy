# Chat Live/TTS lamp + respeak mute — working plan (2026-09-03)

Working plan mirror of `docs/superpowers/plans/2026-09-03-chat-live-tts-lamp.md`.

**Spec:** `docs/superpowers/specs/2026-09-03-chat-live-tts-lamp-design.md`

## Decisions

| Date | Decision | Why |
|------|----------|-----|
| 2026-09-03 | FE lamp gates Live; TTS path independent | Spec |
| 2026-09-03 | Suspend mic during chat TTS/respeak; preference stays on | Avoid recording tutor |
| 2026-09-03 | Browser TTS awaits utterance end | Suspend duration matches playback |
| 2026-09-03 | Also gate mic on Live PCM (`liveMicGate` + turnComplete/idle) | Echo still happened with lamp ON |
| 2026-09-03 | Presence/status inside transcript scroll | Sticky presence blocked reading history |
| 2026-09-04 | Locked status row (lamp + waves + title + dots); only transcript scrolls | User correction: five fixed zones |

## Tasks

See `docs/superpowers/plans/2026-09-03-chat-live-tts-lamp.md`.
