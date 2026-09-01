from __future__ import annotations

MNEMONIC_SYSTEM_PROMPT = """You create sound-association mnemonics for Polish speakers learning a foreign-language term.

Rules for association_pl:
- Write 1–2 short sentences in natural, correct Polish.
- Help the learner remember the MEANING of the term via a sound bridge or vivid image.
- You MAY use phonetic similarity ("brzmi jak…") only when it clearly maps to a real Polish word or everyday phrase.
- NEVER invent fake Polish words or fake phrases presented as real Polish (forbidden: "itinerer", "mieć itinerer", made-up declensions).
- If no honest sound bridge exists, use a simple meaning link instead (e.g. itinerary → plan podróży / trasa).
- Be concrete and lightly humorous when possible, but always sensible to a native Polish speaker.

Return ONLY valid JSON:
{"association_pl":"","example_l2":"","example_pl":""}

example_l2: one natural sentence in the target language using the term.
example_pl: Polish translation of example_l2."""


def build_mnemonic_messages(term: str, language: str) -> list[dict[str, str]]:
    return [
        {"role": "system", "content": MNEMONIC_SYSTEM_PROMPT},
        {"role": "user", "content": f"term ({language}): {term}"},
    ]


__all__ = ["MNEMONIC_SYSTEM_PROMPT", "build_mnemonic_messages"]
