# Package 4 — Shadowing (working notes)

## Locked (user 2026-08-27)

| Decision | Choice |
|---|---|
| Entry | **Separate learning mode** inside renamed tab |
| IA | Bottom tabs: **Chat / Memo / Menu** (was Chat / Words / Menu) |
| Memo sub-tabs | **Flashcards** (Due / Categories / Pending / export) · **Shadowing** · **Mnemonics** |
| Flow | Agent asks about **topic** → material = **generated dialogue** OR **user picks an existing conversation** → Agent runs shadowing on that dialogue |
| Turn UX | Play → repeat → STT → short feedback → next; **show-text on/off** before session (default: text on) |
| Feedback / vocab | Tip + optional Add → Pending; **end of session** propose hard lines → Pending batch (`source=shadowing`) |
| Model audio | **Session switch: TTS \| Live** (user choice before/during setup) |
| Cap | TTS + STT + GenAI (+ Live if chosen) count toward spend_cap; block start/continue when at cap |

## Open

_(none — spec written)_

## Spec

`docs/superpowers/specs/2026-08-27-shadowing-memo-design.md`
