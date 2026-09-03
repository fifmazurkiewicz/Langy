# Whole-branch review package — tutor listening space
Files in scope only (exclude unrelated dirty shadowing/chat):
diff --git a/AGENTS.md b/AGENTS.md
index 38b9c65..477a427 100644
--- a/AGENTS.md
+++ b/AGENTS.md
@@ -45,16 +45,17 @@ Local dev without Supabase: leave `NEXT_PUBLIC_SUPABASE_*` empty so the frontend
 - **Graft:** before broad exploration `graft map` / `graft ask "ÔÇŽ" --source` (or MCP). Cache in `/graft/` (gitignored). Wiring: `.cursor/rules/graft.mdc`, `.cursor/mcp.json`. On this machine full `graft` CLI install may need VS C++ build tools.
 
 ## Learned User Preferences
 
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
 - Shadowing: agent asks topic, then generated dialogue or pick past conversation; show-text on/off before session (default on); audio TTS|Live switch; tip + optional Add during session and hard-line batch at end Ôćĺ Pending (`shadowing`).
 - Mnemonics: Generate/Regenerate via Mnemonic button on Vocabulary and Due cards (same panel); no images, no user-owned mnemonics.
 - Coach packages build order: 1 interactive transcript + selection dictionary Ôćĺ 2 in-flight correction Ôćĺ 4 shadowing Ôćĺ 3 mnemonics (GenAI on demand; no images; no user-owned mnemonics).
diff --git a/backend/app/domain/agenda/service.py b/backend/app/domain/agenda/service.py
index 21f05c3..307e52a 100644
--- a/backend/app/domain/agenda/service.py
+++ b/backend/app/domain/agenda/service.py
@@ -6,25 +6,25 @@ from sqlalchemy.orm import Session
 
 from app.domain.fsrs.service import create_fsrs_card
 from app.domain.providers.text import TextCompletionProvider, get_text_provider
 from app.domain.plan.service import get_active_plan
 from app.models import Conversation, Job, User, UserLanguageProfile, UserMemoryFact, ConversationSummary, VocabItem
 
 
 OPENING_LINES = [
-    "What would you like to talk about today?",
-    "What are you learning right now ÔÇö shall we practice?",
-    "What's on your mind for today's practice?",
+    "I'm listening ÔÇö what would you like to talk about today?",
+    "Take your time ÔÇö whenever you're ready, tell me what you'd like to practice.",
+    "Happy to listen. Go ahead whenever you want to start.",
 ]
 
 RESUME_LINES = [
-    "Welcome back! Shall we pick up where we left off?",
-    "Good to see you again ÔÇö ready to continue?",
-    "Let's continue ÔÇö what would you like to talk about next?",
+    "Welcome back ÔÇö I'm listening whenever you're ready to continue.",
+    "Good to see you again. Take your time; we can pick up whenever you like.",
+    "I'm here. Go ahead when you want to continue.",
 ]
 
 
 def build_agenda(db: Session, user: User, language: str) -> dict[str, Any]:
     profile = (
         db.query(UserLanguageProfile)
         .filter(UserLanguageProfile.user_id == user.id, UserLanguageProfile.language == language)
         .first()
diff --git a/backend/app/domain/voice/live_session.py b/backend/app/domain/voice/live_session.py
index 8e00f7e..84385b2 100644
--- a/backend/app/domain/voice/live_session.py
+++ b/backend/app/domain/voice/live_session.py
@@ -7,17 +7,20 @@ from app.domain.skills import skills_to_cefr
 def build_live_system_instruction(agenda: dict) -> str:
     profile = agenda.get("profile") or {}
     skills = profile.get("skills") or {}
     plan = agenda.get("study_plan")
     parts = [
         "You are Langy, a friendly language tutor. The learner's native language is Polish; speak in the target language unless they ask for Polish.",
         f"Target language session: {agenda.get('language')}.",
         f"Motivations: {', '.join(profile.get('motivations') or []) or 'general practice'}.",
-        "Opening: ask what they want to talk about or practice today. Do not list their interests unless they are silent.",
+        "Turn-taking (every turn, including opening): (1) briefly react to the learner's intention or last message; "
+        "(2) develop the topic with comments or examples ÔÇö prefer statements over questions; "
+        "(3) at most one open invitation to continue speaking. Never ask multiple questions in one turn. Give the learner space to speak.",
+        "Opening: invite them to talk or practice; do not list their interests unless they are silent or unsure.",
         "When the user asks to save a word, acknowledge you will save it.",
     ]
     if plan:
         parts.append(
             f"Optional study context: CEFR {plan.get('cefr_level')}, day {plan.get('progress_day')}, "
             f"topic hint: {plan.get('current_topic') or 'flexible'}."
         )
     if skills:
diff --git a/backend/tests/domain/voice/test_live_token.py b/backend/tests/domain/voice/test_live_token.py
index 43cf66f..23eaa67 100644
--- a/backend/tests/domain/voice/test_live_token.py
+++ b/backend/tests/domain/voice/test_live_token.py
@@ -14,16 +14,29 @@ def test_build_live_system_instruction_includes_language():
         "study_plan": {"cefr_level": "A2", "progress_day": 3, "current_topic": "Travel"},
     }
     text = build_live_system_instruction(agenda)
     assert "en-GB" in text
     assert "travel" in text
     assert "A2" in text
 
 
+def test_build_live_system_instruction_includes_listening_space_rules():
+    agenda = {
+        "language": "en-GB",
+        "profile": {"motivations": ["travel"], "skills": {}},
+        "memory_facts": [],
+        "study_plan": None,
+    }
+    text = build_live_system_instruction(agenda).lower()
+    assert "react" in text or "intention" in text or "intent" in text
+    assert "one" in text and ("question" in text or "invite" in text or "invitation" in text)
+    assert "multiple questions" in text or "do not ask more than one" in text or "at most one" in text
+
+
 def test_mint_token_requires_api_key():
     with pytest.raises(LiveTokenError):
         mint_ephemeral_live_token(system_instruction="Hi", api_key="")
 
 
 def test_mint_token_success():
     mock_response = MagicMock()
     mock_response.status_code = 200
diff --git a/docs/architecture-for-cursor.md b/docs/architecture-for-cursor.md
index 4c4c583..4fc8ecb 100644
--- a/docs/architecture-for-cursor.md
+++ b/docs/architecture-for-cursor.md
@@ -266,16 +266,18 @@ Build ephemeral system prompt from:
 
 - `user_language_profile` for **active language** (skills, motivations, interests)
 - due `fsrs_cards` (opportunistic weave only)
 - up to **50** `user_memory_facts` (recent / salient)
 - **last 3** `conversation_summaries`
 
 **Opening:** first agent turn uses a **varied** line from a small pool ÔÇö ask what to talk about today or what theyÔÇÖre learning. **Do not** list Interests in that opening. If user is silent / unsure, Agent may **softly** suggest from Interests ÔÇö never force a lesson plan. User leads. Polish only on explicit request.
 
+**Listening space:** Every tutor turn (including opening) should (1) briefly react to the learner's intention, (2) develop the topic with statements/examples, (3) use at most one open invitation ÔÇö never stack multiple questions. Prefer giving the learner room to speak.
+
 ### 7.2 Session end + extraction + memory + Pending
 
 - Session ends **only** via explicit **End session**.
 - Chat Ôćĺ Idle immediately; background job wave:
   1. Vocab candidates Ôćĺ Pending (`chat_extraction`)
   2. **Memory:** upsert lasting **facts** (global) + write **session summary**
 - Empty vocab Ôćĺ toast ÔÇťNo new words from that chatÔÇŁ. Facts/summary may still update.
 - Memo Flashcards badge for Pending. Accept/Reject as before; Pending never expires. Memory GenAI Ôćĺ ledger + Langfuse.
diff --git a/docs/superpowers/specs/2026-08-26-chat-interests-memory-design.md b/docs/superpowers/specs/2026-08-26-chat-interests-memory-design.md
index aead6c3..af6011f 100644
--- a/docs/superpowers/specs/2026-08-26-chat-interests-memory-design.md
+++ b/docs/superpowers/specs/2026-08-26-chat-interests-memory-design.md
@@ -13,8 +13,12 @@
   - a short **session summary** (1ÔÇô3 sentences)
 - Chat agenda receives: structured profile (active language) + **top facts** + **last N session summaries** ÔÇö not full transcripts in the prompt (transcripts stay in DB).
 - **Defaults:** inject up to **50** facts (most recent / highest salience) and **last 3** session summaries into the agenda. Store more in DB; UI can show the full editable list.
 - **Menu Ôćĺ Memory:** user can **view, edit, and delete** facts (and see recent summaries). Edits are authoritative for future agendas.
 
 ## Cost
 
 Fact/summary extraction counts as **GenAI** toward monthly spend cap (same as vocab extraction).
+
+## Listening space (2026-09-03)
+
+Mid-session and opening share the same turn-taking contract: react Ôćĺ develop Ôćĺ at most one open invite; no multi-question turns. Opening/resume line pools invite space to speak (not interview openers). Soft Interests-on-silence unchanged.

===== NEW test_opening_lines.py =====

from app.domain.agenda.service import OPENING_LINES, RESUME_LINES

FORBIDDEN_MARKERS = ("shall we practice?", "what's on your mind for today's practice?")


def test_opening_lines_invite_space_not_interview():
    assert len(OPENING_LINES) >= 3
    joined = " ".join(OPENING_LINES).lower()
    for marker in FORBIDDEN_MARKERS:
        assert marker not in joined
    # Spacious invitations: prefer offer/space wording over quiz tone
    assert any(
        any(word in line.lower() for word in ("whenever", "take your time", "i'm listening", "go ahead", "happy to listen", "what would you like"))
        for line in OPENING_LINES
    )


def test_resume_lines_invite_space():
    assert len(RESUME_LINES) >= 3
    joined = " ".join(RESUME_LINES).lower()
    assert "shall we pick up where we left off?" not in joined
