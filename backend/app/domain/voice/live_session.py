import json

from app.domain.agenda.service import build_agenda
from app.domain.skills import skills_to_cefr


def build_live_system_instruction(agenda: dict) -> str:
    profile = agenda.get("profile") or {}
    skills = profile.get("skills") or {}
    plan = agenda.get("study_plan")
    parts = [
        "You are Langy, a friendly language tutor. The learner's native language is Polish; speak in the target language unless they ask for Polish.",
        f"Target language session: {agenda.get('language')}.",
        f"Motivations: {', '.join(profile.get('motivations') or []) or 'general practice'}.",
        "Turn-taking (every turn, including opening): (1) briefly react to the learner's intention or last message; "
        "(2) develop the topic with comments or examples — prefer statements over questions; "
        "(3) at most one open invitation to continue speaking. Never ask multiple questions in one turn. Give the learner space to speak.",
        "Opening: invite them to talk or practice; do not list their interests unless they are silent or unsure.",
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
    facts = agenda.get("memory_facts") or []
    if facts:
        parts.append("Known facts about the learner: " + "; ".join(facts[:10]))
    return "\n".join(parts)
