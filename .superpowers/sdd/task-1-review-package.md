# Review package Task 1
BASE: 4a8e09fb (working tree, no commits)
 M backend/app/api/routes/shadowing.py
 M backend/app/domain/chat/__init__.py
 M backend/app/domain/chat/transcript.py
 M backend/tests/domain/chat/test_transcript.py
 M backend/tests/domain/voice/test_live_token.py
 M docs/ux/ux-ui-spec.md
 M frontend/src/components/shadowing/ShadowingFlow.tsx
 M frontend/src/lib/api/shadowing.ts
?? .cursor/plans/2026-09-03-tutor-listening-space.md
?? .superpowers/
?? backend/tests/api/test_shadowing_conversations_list.py
?? backend/tests/domain/agenda/
?? docs/superpowers/plans/2026-09-03-shadowing-conversation-preview.md
?? docs/superpowers/plans/2026-09-03-tutor-listening-space.md
?? docs/superpowers/specs/2026-09-03-shadowing-conversation-preview-design.md
?? docs/superpowers/specs/2026-09-03-tutor-listening-space-design.md
 backend/tests/domain/voice/test_live_token.py | 13 +++++++++++++
 1 file changed, 13 insertions(+)
diff --git a/backend/tests/domain/voice/test_live_token.py b/backend/tests/domain/voice/test_live_token.py
index 43cf66f..23eaa67 100644
--- a/backend/tests/domain/voice/test_live_token.py
+++ b/backend/tests/domain/voice/test_live_token.py
@@ -12,20 +12,33 @@ def test_build_live_system_instruction_includes_language():
         "profile": {"motivations": ["travel"], "skills": {"speaking": 2}},
         "memory_facts": ["Likes hiking"],
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
     mock_response.json.return_value = {"name": "auth_tokens/abc", "expireTime": "2026-01-01T00:00:00Z"}
 

===== NEW FILE test_opening_lines.py =====

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
