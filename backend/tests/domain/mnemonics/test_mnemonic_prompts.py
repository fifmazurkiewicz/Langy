from app.domain.mnemonics.prompts import MNEMONIC_SYSTEM_PROMPT, build_mnemonic_messages


def test_mnemonic_prompt_forbids_fake_polish_words():
    lowered = MNEMONIC_SYSTEM_PROMPT.lower()
    assert "never invent fake" in lowered
    assert "itinerer" in MNEMONIC_SYSTEM_PROMPT


def test_build_mnemonic_messages_includes_term():
    messages = build_mnemonic_messages("itinerary", "en-GB")
    assert messages[0]["role"] == "system"
    assert "itinerary" in messages[1]["content"]
