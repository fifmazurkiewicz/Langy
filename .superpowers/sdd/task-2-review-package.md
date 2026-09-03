# Review package Task 2
diff --git a/backend/app/domain/agenda/service.py b/backend/app/domain/agenda/service.py
index 21f05c3..307e52a 100644
--- a/backend/app/domain/agenda/service.py
+++ b/backend/app/domain/agenda/service.py
@@ -4,29 +4,29 @@ from typing import Any
 
 from sqlalchemy.orm import Session
 
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
     )
     facts = (
diff --git a/backend/app/domain/voice/live_session.py b/backend/app/domain/voice/live_session.py
index 8e00f7e..84385b2 100644
--- a/backend/app/domain/voice/live_session.py
+++ b/backend/app/domain/voice/live_session.py
@@ -5,21 +5,24 @@ from app.domain.skills import skills_to_cefr
 
 
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
         cefr_skills = skills_to_cefr(skills)
         parts.append(f"Self-assessed skills (CEFR): {json.dumps(cefr_skills)}")
