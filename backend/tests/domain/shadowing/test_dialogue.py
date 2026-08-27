from app.domain.shadowing.dialogue import lines_from_conversation_transcript


def test_lines_from_transcript_agent_only():
    transcript = "Agent: Hello there.\nUser: Hi!\nAgent: How are you today?"
    lines = lines_from_conversation_transcript(transcript)
    assert len(lines) == 2
    assert all(l.role == "agent" for l in lines)
    assert lines[0].text == "Hello there."
    assert lines[1].text == "How are you today?"


def test_generate_dialogue_minimum_lines():
    class Provider:
        def complete_json(self, messages):
            return {"lines": [{"role": "agent", "text": "Hi"}]}

    from app.domain.shadowing.dialogue import generate_dialogue

    lines = generate_dialogue(Provider(), topic="travel", language="en-GB")
    assert len(lines) >= 4
