# Review package Task 3
diff --git a/AGENTS.md b/AGENTS.md
index 38b9c65..477a427 100644
--- a/AGENTS.md
+++ b/AGENTS.md
@@ -48,10 +48,11 @@ Local dev without Supabase: leave `NEXT_PUBLIC_SUPABASE_*` empty so the frontend
 
 - Keep Superpowers mandatory; Graft and Superpowers belong in global Cursor rules; greenfield ÔÇö no FreeLingo fork (reference only); no feature code until scaffold + relevant plan Task 0 pass.
 - Native language is always Polish; English is the primary language to learn, with multi-language support from the start; Polish mid-chat only when the user explicitly asks.
 - Language change must be a single control that updates context everywhere; Classical language markers (e.g. GB/DE), not emoji flags.
 - Motivation and interests are per target language; the motivation interview depends on the active language; Chat uses Interests only softly (opening = varied ÔÇťwhat to talk about / learn?ÔÇŁ with no Interests listed; soft suggestions only if silent or unsure).
+- Tutor turns: react to intent, develop with statements, at most one open invitation; never stack questions; opening/resume lines leave space to speak.
 - Users can accept or reject extracted words; the agent may save a word to flashcards when the user asks; flashcard export to `.txt` as Quizlet paste: `term<TAB>definition` with newline between cards.
 - Monthly spend_cap is admin-configurable and sums TTS + ASR + gen AI; when exceeded, block costly actions for the rest of the month but allow browsing and reviewing existing flashcards.
 - Chat always has a text input; Tutor voice toggle (off default, sessionStorage) ÔÇö off = transcript only, on = browser TTS or Live when connected; full voice = Tutor voice on + Listening on; Listening is an optional on/off toggle (on = VAD hands-free; off = mic idle) with speak/mic when off ÔÇö not push-to-talk; MicStatusBanner; Web Speech needs Chrome or Edge (Firefox unsupported; Safari desktop partial, iOS unreliable).
 - Menu hub (drill-in per UX ┬ž11.3): Languages, Profile (motivation/interests/skills per language; explicit Save), Plan, Memory (view/edit/delete facts; explicit Save), Appearance (System/Light/Dark), optional Admin, Sign out.
 - Bottom nav is Chat / Memo / Menu; Memo main tabs Flashcards, Vocabulary, Shadowing (no standalone Mnemonics tab); Flashcards sub-tabs Due today (category picker first) / Pending / Generate; favourite interest categories in Generate; Vocabulary = accepted words grouped by category with local search, Mnemonic per term, and delete.
diff --git a/docs/architecture-for-cursor.md b/docs/architecture-for-cursor.md
index 4c4c583..4fc8ecb 100644
--- a/docs/architecture-for-cursor.md
+++ b/docs/architecture-for-cursor.md
@@ -269,10 +269,12 @@ Build ephemeral system prompt from:
 - up to **50** `user_memory_facts` (recent / salient)
 - **last 3** `conversation_summaries`
 
 **Opening:** first agent turn uses a **varied** line from a small pool ÔÇö ask what to talk about today or what theyÔÇÖre learning. **Do not** list Interests in that opening. If user is silent / unsure, Agent may **softly** suggest from Interests ÔÇö never force a lesson plan. User leads. Polish only on explicit request.
 
+**Listening space:** Every tutor turn (including opening) should (1) briefly react to the learner's intention, (2) develop the topic with statements/examples, (3) use at most one open invitation ÔÇö never stack multiple questions. Prefer giving the learner room to speak.
+
 ### 7.2 Session end + extraction + memory + Pending
 
 - Session ends **only** via explicit **End session**.
 - Chat Ôćĺ Idle immediately; background job wave:
   1. Vocab candidates Ôćĺ Pending (`chat_extraction`)
diff --git a/docs/superpowers/specs/2026-08-26-chat-interests-memory-design.md b/docs/superpowers/specs/2026-08-26-chat-interests-memory-design.md
index aead6c3..af6011f 100644
--- a/docs/superpowers/specs/2026-08-26-chat-interests-memory-design.md
+++ b/docs/superpowers/specs/2026-08-26-chat-interests-memory-design.md
@@ -16,5 +16,9 @@
 - **Menu Ôćĺ Memory:** user can **view, edit, and delete** facts (and see recent summaries). Edits are authoritative for future agendas.
 
 ## Cost
 
 Fact/summary extraction counts as **GenAI** toward monthly spend cap (same as vocab extraction).
+
+## Listening space (2026-09-03)
+
+Mid-session and opening share the same turn-taking contract: react Ôćĺ develop Ôćĺ at most one open invite; no multi-question turns. Opening/resume line pools invite space to speak (not interview openers). Soft Interests-on-silence unchanged.
