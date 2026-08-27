# Design — Shadowing mode + Memo IA (Package 4)

**Date:** 2026-08-27  
**Status:** approved  
**Product:** Langy  
**Depends on:** Chat conversations history, TTS/STT providers, spend_cap, Pending vocab, optional Live credentials  
**Roadmap:** 1 transcript → 2 correction → **4 shadowing** → 3 mnemonics

## Goal

Provide a dedicated **Shadowing** practice mode under the **Memo** tab: the agent asks for a topic, material is either a **generated dialogue** or a **user-selected past conversation**, then the agent runs line-by-line shadowing (play → user repeat → feedback). Include a **TTS | Live** switch for model audio and optional show-text. Hard lines can go to Pending during and at end of session.

Also lock IA rename: bottom tabs **Chat / Memo / Menu** (Words → Memo).

## Non-goals

- Replacing Chat as default home  
- Shadowing-only Mistakes queue  
- Mnemonics (Package 3)  
- Fourth bottom tab  
- Requiring a CEFR plan to shadow  

## IA (LOCKED)

| Tab | Role |
|---|---|
| **Chat** | Voice/text conversation (default home) |
| **Memo** | Learning practice hub |
| **Menu** | Account, Languages, Profile, Plan, Memory, Appearance, Admin, Sign out |

### Memo sub-tabs

| Sub-tab | Content |
|---|---|
| **Flashcards** | Former Words: Due today \| Categories \| Pending \| Quizlet export |
| **Shadowing** | This mode |
| **Mnemonics** | Association library (Package 3) |

Pending badge remains on the **Memo** tab (Flashcards Pending count).

## Shadowing flow

1. **Open** Memo → Shadowing.  
2. **Intake:** agent asks about topic / what to practice (text or short voice OK).  
3. **Material:**  
   - **Generate dialogue** from topic (+ active language, optional CEFR if present), or  
   - **Pick conversation** from user’s past Chat sessions (same language).  
4. **Setup (before start):**  
   - Show text: **on/off** (default **on**)  
   - Model audio: **TTS | Live**  
5. **Loop:** for each target line (typically agent/native side of dialogue, or selected lines):  
   - Play model audio (TTS or Live per switch)  
   - User repeats (mic / STT)  
   - Short feedback tip (OK or corrected L2 + short PL)  
   - Optional **Add to learning** → Pending `source=shadowing`  
6. **End session:** propose batch of hard lines → user Accept/Skip into Pending (`shadowing`).  
7. Return to Shadowing hub / Memo.

## Approaches

**Chosen: A** — dedicated Shadowing session UI inside Memo (not a Chat voice-mode hack).

## Audio

| Switch | Model line playback | User capture |
|---|---|---|
| **TTS** | `TTS_PROVIDER` via backend | STT |
| **Live** | Short Live (or equivalent) utterance of the line | STT (or Live input if simpler later; MVP: STT after play) |

Both paths meter toward `spend_cap`. At cap: cannot start or continue costly steps; browsing Memo Flashcards / review OK.

## Data (ADDED)

### `shadowing_sessions`

- `id`, `user_id`, `language`, `topic`, `source` (`generated` | `conversation`), `conversation_id` nullable, `dialogue` jsonb (ordered lines with role/text), `show_text` bool, `audio_mode` (`tts`|`live`), `started_at`, `ended_at`, `hard_line_ids` jsonb nullable.

### `vocab_items.source`

Add `'shadowing'`.

## API (illustrative)

- `POST /api/shadowing/sessions` — start (topic + generate | conversation_id + setup flags)  
- `POST /api/shadowing/sessions/{id}/turns` — submit user audio/transcript for line; return feedback  
- `POST /api/shadowing/sessions/{id}/pending` — single Add or end-batch  
- `POST /api/shadowing/sessions/{id}/end`  
- List conversations for picker: reuse existing conversations list filtered by language  

## Given / When / Then

| Given | When | Then |
|---|---|---|
| Under cap | User starts generate path | Dialogue stored; session ready |
| Under cap | User picks conversation | Lines derived from transcript; session ready |
| Show-text off | Line plays | Text hidden until after attempt (or never until end — **Decision:** reveal model line text only after user attempt when off) |
| User taps Add on a line | — | Pending `shadowing` |
| End session | Soft lines marked hard | Batch UI → Pending Accept/Skip |
| At cap | Start shadowing | Blocked |

## Spend / Langfuse

- Dialogue generation, per-turn feedback GenAI, TTS, STT, Live → ledger + Langfuse.  
- Prompts: `shadowing_dialogue_generate`, `shadowing_turn_feedback`, `shadowing_hard_lines_summary`.

## Testing

- Session create generate vs conversation.  
- Turn feedback + pending source.  
- Cap 402 on start.  
- FE: Memo tabs; setup switches; loop; end batch.

## Decisions log

| Date | Decision | Why |
|---|---|---|
| 2026-08-27 | Separate Shadowing mode | User |
| 2026-08-27 | Words → Memo; Flashcards + Shadowing | User |
| 2026-08-27 | Topic → generate or pick conversation | User |
| 2026-08-27 | Show-text on/off (default on) | User D |
| 2026-08-27 | End batch hard lines + mid Add → Pending | User D |
| 2026-08-27 | TTS \| Live switch | User |
| 2026-08-27 | Approach A dedicated session | Clear mode boundary |
| 2026-08-27 | Show-text off → reveal after attempt | Fair practice |
