import { describe, expect, it } from "vitest";

import type { PlanLessonProgress } from "@/lib/api/plan";
import { groupLessonsByWeek, recentlyCompleted } from "./progress";

function lesson(day: number, week: number, completedAt: string | null = null): PlanLessonProgress {
  return {
    day,
    week,
    title: `Day ${day}`,
    lesson_type: "grammar",
    topic: "Greetings",
    lesson_id: `l${day}`,
    is_completed: completedAt !== null,
    completed_at: completedAt,
  };
}

describe("groupLessonsByWeek", () => {
  it("groups and orders lessons by week and day", () => {
    const grouped = groupLessonsByWeek([lesson(4, 2), lesson(2, 1), lesson(1, 1), lesson(3, 2)]);
    expect(grouped.map((w) => w.week)).toEqual([1, 2]);
    expect(grouped[0].lessons.map((l) => l.day)).toEqual([1, 2]);
    expect(grouped[1].lessons.map((l) => l.day)).toEqual([3, 4]);
  });
});

describe("recentlyCompleted", () => {
  it("returns completed lessons newest first", () => {
    const result = recentlyCompleted([
      lesson(1, 1, "2026-09-01T10:00:00+00:00"),
      lesson(2, 1),
      lesson(3, 1, "2026-09-03T10:00:00+00:00"),
    ]);
    expect(result.map((l) => l.day)).toEqual([3, 1]);
  });
});
