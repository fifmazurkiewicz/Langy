CEFR_LEVELS = ("A1", "A2", "B1", "B2", "C1", "C2")

DEFAULT_SKILL_LEVEL = 2

# Stored as 1–6 in DB/API. Legacy profiles used 1–5 (top = C1); level 6 = C2 was added later.
# No migration: existing value 5 continues to map to C1.


def clamp_skill_level(level: int | None) -> int:
    if level is None or level < 1:
        return DEFAULT_SKILL_LEVEL
    return min(level, len(CEFR_LEVELS))


def skill_level_to_cefr(level: int | None) -> str:
    return CEFR_LEVELS[clamp_skill_level(level) - 1]


def skills_to_cefr(skills: dict[str, int | None]) -> dict[str, str]:
    return {aspect: skill_level_to_cefr(value) for aspect, value in skills.items() if value is not None}
