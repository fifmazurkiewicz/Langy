from typing import Any

LESSON_TYPES = ["grammar", "vocabulary", "reading", "writing", "listening", "speaking", "review"]

TOPICS_EN = {
    "A1": ["Greetings", "Numbers", "Family", "Food basics", "Daily routine"],
    "A2": ["Travel", "Shopping", "Weather", "Hobbies", "Past events"],
    "B1": ["Work", "Opinions", "Media", "Health", "Plans"],
    "B2": ["Debate", "Culture", "Abstract ideas", "Professional", "News"],
    "C1": ["Nuanced expression", "Academic", "Literature", "Negotiation", "Analysis"],
    "C2": ["Mastery review", "Idioms", "Register", "Rhetoric", "Synthesis"],
}


def days_per_week(duration_weeks: int) -> int:
    return {4: 5, 8: 4, 12: 3, 16: 2}.get(duration_weeks, 3)


def generate_plan_grid(cefr_level: str, duration_weeks: int, language: str) -> dict[str, Any]:
    topics = TOPICS_EN.get(cefr_level, TOPICS_EN["A1"])
    dpw = days_per_week(duration_weeks)
    weeks: list[dict[str, Any]] = []
    day_idx = 0
    for week in range(1, duration_weeks + 1):
        days = []
        for d in range(dpw):
            topic = topics[day_idx % len(topics)]
            lesson_type = LESSON_TYPES[day_idx % len(LESSON_TYPES)]
            days.append(
                {
                    "day": day_idx + 1,
                    "week": week,
                    "title": f"{topic} — {lesson_type}",
                    "lesson_type": lesson_type,
                    "topic": topic,
                }
            )
            day_idx += 1
        weeks.append({"week": week, "days": days})
    return {
        "cefr_level": cefr_level,
        "language": language,
        "duration_weeks": duration_weeks,
        "days_per_week": dpw,
        "total_days": day_idx,
        "weeks": weeks,
    }
