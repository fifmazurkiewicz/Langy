# Chat brevity voice controls & Memory — Implementation Plan

> **For agentic workers:** Use executing-plans / TDD per task. Spec: `docs/superpowers/specs/2026-09-03-chat-brevity-voice-controls-memory-design.md`

**Goal:** Finish Chat chrome (dots, End session, no Speak button), Agent respeak, TTS rate, Memory essay, chained soft brevity.

**Architecture:** Frontend Classical chrome + profile `tts_playback_rate`; shared soft-brevity fragment for Live/text-turn/chained.

**Tech Stack:** Next.js, FastAPI, Supabase SQL migration, vitest/pytest

## Tasks

- [x] VoiceDots under History; remove wide toggles; End session full-width; remove Speak from composer
- [x] Speaker respeak on Agent lines
- [x] `tts_playback_rate` column + Profile slider + apply in playTts
- [x] Memory facts essay UI (tap to edit)
- [x] Chained pipeline uses soft brevity; sync ux-ui-spec §11.1
