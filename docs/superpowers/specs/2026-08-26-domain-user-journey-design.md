# Domain user journey — design (2026-08-26)

Approved in domain review. Durable contract also synced into `docs/architecture-for-cursor.md` and `docs/ux/ux-ui-spec.md`.

## Happy path

1. Google OAuth → onboarding (languages → per-language Motivation / Interests / Self-assessment, each skippable except languages) → **explicit pick of `active_language`** → Chat.
2. Interests create category sets; **auto Generate first words** runs in background → results land in **Pending** (not auto-accepted).
3. Chat: optional **listening toggle**; opening = varied “what to talk about / learn?” (no Interests listed). Soft Interests only if silent/unsure. Agenda includes global **memory facts** + last summaries.
4. On End: Idle; background wave = vocab Pending **+** memory facts/summary.
5. Voice: Live direct when `speech_to_speech`; chained via Render. Cold API → **Waking up…**.
5. If candidates: Words tab **badge**; shared **Pending** queue (source labeled: chat / category). Accept → FSRS card; Reject → no card. Pending **never auto-expires**.
6. If no new words: toast **“No new words from that chat”** (no empty Pending).
7. Mid-chat: user asks to save a word → `agent_save` → accepted + card + verbal ack.
8. Polish mid-chat: **only if user explicitly asks** (or clearly requests L1 help).
9. Words: Due today | Categories | Pending; Export accepted cards as Quizlet paste: **`term\tdefinition` + newline**.
10. New user `spend_cap_usd = 10` (monthly, Europe/Warsaw). At cap: costly actions blocked; reviews OK.

## Given / When / Then (core)

| Given | When | Then |
|---|---|---|
| Active session | User taps End session | Session ends; Idle; extraction enqueued |
| Extraction finds candidates | Job completes | Pending items + Words badge |
| Extraction finds none / only dupes | Job completes | Toast only; no Pending spam |
| Pending item | User Accepts | `accepted` + `fsrs_cards` row |
| Pending item | User Rejects | `rejected`; no card; stays out of Due |
| Pending ignored | Days/months pass | Still pending (no auto action) |
| Onboarding done with interests | Onboarding completes | Generate-first jobs → Pending |
| User in chat | Says save this word | `agent_save` accepted immediately |
| User in chat | Asks for Polish help | Agent may use PL |
| User at monthly cap | Tries Chat / Generate | Blocked; Due today still works |
| User exports | Chooses export | `.txt` or clipboard: tab-separated, newline between cards |

## Out of scope here

Inbound Quizlet import, manual card authoring, session idle timeout, auto-PL without request.
