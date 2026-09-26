import type { PlanLessonProgress } from "@/lib/api/plan";

export function groupLessonsByWeek(lessons: PlanLessonProgress[]): { week: number; lessons: PlanLessonProgress[] }[] {
  const weeks = new Map<number, PlanLessonProgress[]>();
  for (const lesson of lessons) {
    const list = weeks.get(lesson.week) ?? [];
    list.push(lesson);
    weeks.set(lesson.week, list);
  }
  return [...weeks.entries()]
    .sort(([a], [b]) => a - b)
    .map(([week, items]) => ({ week, lessons: [...items].sort((a, b) => a.day - b.day) }));
}

/** Most recent completions first. */
export function recentlyCompleted(lessons: PlanLessonProgress[], limit = 5): PlanLessonProgress[] {
  return lessons
    .filter((l) => l.is_completed)
    .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? "") || b.day - a.day)
    .slice(0, limit);
}
