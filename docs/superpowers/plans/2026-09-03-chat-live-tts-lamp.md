# Chat Live/TTS lamp + respeak mic mute — Implementation Plan

> **For agentic workers:** Execute task-by-task with TDD.

**Goal:** Add Chat header Live Gemini lamp (TTS when off) and pause Listening during tutor respeak/TTS so the mic does not capture tutor audio.

**Architecture:** FE `localStorage` preference gates Live connect; `LiveGeminiLamp` left of language switcher. Mic input uses `listening && !micSuspended`; suspend around `speakTutorLine` (await until playback ends).

**Tech Stack:** Next.js / React / Vitest / Classical chrome.

**Spec:** `docs/superpowers/specs/2026-09-03-chat-live-tts-lamp-design.md`

## Decisions

| Date | Decision | Why |
|------|----------|-----|
| 2026-09-03 | Implement lamp per existing design | Spec approved; missing from FE |
| 2026-09-03 | Suspend Listening during any chat `speakTutorLine` (respeak + TTS path) | Same echo bug for opening/reply TTS |
| 2026-09-03 | Listening preference stays on; only gate recognition | Dot stays user intent |
| 2026-09-03 | Also gate mic on Live PCM (`liveMicGate` + turnComplete/idle) | Echo still happened with lamp ON |
| 2026-09-03 | Presence/status inside transcript scroll | Sticky presence blocked reading history |

## File map

- Create: `frontend/src/lib/voice/liveGeminiPreference.ts` (+ test)
- Create: `frontend/src/lib/voice/withMicSuspended.ts` (+ test)
- Create: `frontend/src/components/chat/LiveGeminiLamp.tsx` (+ fill helper test via voiceDotFill)
- Modify: `frontend/src/lib/voice/playTts.ts` — browser speak awaits `onend`
- Modify: `frontend/src/app/chat/page.tsx` — lamp + liveGemini gate + mic suspend
- Modify: `docs/ux/ux-ui-spec.md` §11.1
- Create: `.cursor/plans/2026-09-03-chat-live-tts-lamp.md`

### Task 1: Preference helpers

**Files:** `frontend/src/lib/voice/liveGeminiPreference.ts`, `*.test.ts`

- [ ] Test default true, read/write `langy-chat-live-gemini`
- [ ] Implement helpers
- [ ] Tests pass

### Task 2: Mic suspend helper + browser TTS await

**Files:** `withMicSuspended.ts`, `playTts.ts`, tests

- [ ] Test suspend toggles around async work
- [ ] Browser `speakTutorLine` resolves on utterance end
- [ ] Implement

### Task 3: Lamp UI + chat wire

**Files:** `LiveGeminiLamp.tsx`, `chat/page.tsx`

- [ ] Lamp left of LanguageSwitcher
- [ ] `connectLive` / tutor-voice effect require `liveGemini`
- [ ] Toggle OFF → disconnect + cancelSpeech
- [ ] Respeak/TTS wrapped in `withMicSuspended`

### Task 4: Docs sync + verify + push

- [ ] UX §11.1 + working plan Decisions
- [ ] `npm test` / lint relevant
- [ ] Commit + push main
