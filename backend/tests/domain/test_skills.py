from app.domain.skills import skill_level_to_cefr, skills_to_cefr


def test_skill_level_to_cefr_maps_one_through_six():
    assert skill_level_to_cefr(1) == "A1"
    assert skill_level_to_cefr(2) == "A2"
    assert skill_level_to_cefr(3) == "B1"
    assert skill_level_to_cefr(4) == "B2"
    assert skill_level_to_cefr(5) == "C1"
    assert skill_level_to_cefr(6) == "C2"


def test_legacy_top_level_five_stays_c1():
    """Profiles saved on the old 1–5 scale keep C1 at the former maximum."""
    assert skill_level_to_cefr(5) == "C1"


def test_skills_to_cefr_omits_nulls():
    assert skills_to_cefr({"reading": 3, "speaking": None}) == {"reading": "B1"}
