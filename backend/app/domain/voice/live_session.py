import json

from app.domain.agenda.service import build_agenda
from app.domain.skills import skills_to_cefr
from app.domain.voice.soft_brevity import EXERCISE_ALLOWED_RULES, SELF_REPAIR_RULES, SOFT_BREVITY_RULES


def build_live_system_instruction(agenda: dict) -> str:
    profile = agenda.get("profile") or {}
    skills = profile.get("skills") or {}
    plan = agenda.get("study_plan")
    parts = [
        "You are Langy, a friendly language tutor. The learner's native language is Polish; speak in the target language unless they ask for Polish.",
        f"Target language session: {agenda.get('language')}.",
        f"Motivations: {', '.join(profile.get('motivations') or []) or 'general practice'}.",
        "You speak aloud through the Langy app (voice/audio). Never say you have no voice or cannot produce audio. "
        "If the learner cannot hear you, suggest checking Tutor voice is on and device volume — do not claim you are text-only.",
        SOFT_BREVITY_RULES,
        SELF_REPAIR_RULES,
        EXERCISE_ALLOWED_RULES,
        "Turn-taking (every turn, including opening): (1) briefly react to the learner's intention or last message; "
        "(2) develop the topic with comments or examples — prefer statements over questions; "
        "(3) at most one open invitation to continue speaking. Never ask multiple questions in one turn. Give the learner space to speak. "
        "If they requested an exercise, lead that exercise instead of steering to open chat.",
        "Opening: invite them to talk or practice; do not list their interests unless they are silent or unsure.",
        "When the user asks to save a word, acknowledge you will save it.",
    ]
    lesson = agenda.get("lesson")
    if lesson:
        parts.append(
            "This session practises the learner's study-plan lesson "
            f"(week {lesson.get('week')}, day {lesson.get('day')}, {lesson.get('lesson_type')}): "
            f"\"{lesson.get('title')}\". Lesson material the learner has just read:\n"
            f"{lesson.get('body') or lesson.get('topic') or ''}\n"
            "Help them practise exactly this material: get them to produce their own sentences with it, "
            "give short examples, gently correct mistakes related to the lesson, and check understanding one step at a time. "
            "If they clearly want to talk about something else, follow them."
        )
    elif plan:
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
