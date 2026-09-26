import { apiFetch } from "@/lib/api";

export type PlanLessonProgress = {
  day: number;
  week: number;
  title: string;
  lesson_type: string;
  topic: string;
  lesson_id: string | null;
  is_completed: boolean;
  completed_at: string | null;
};

export type PlanProgress = {
  total_lessons: number;
  completed_lessons: number;
  percent: number;
  next_day: number | null;
  weeks: { week: number; total: number; completed: number }[];
  lessons: PlanLessonProgress[];
};

export type StudyPlan = {
  id: string;
  language: string;
  cefr_level: string;
  duration_weeks: number;
  days_per_week: number;
  progress_day: number;
  generated_plan: {
    weeks: { week: number; days: { day: number; title: string; lesson_type: string; topic: string }[] }[];
    total_days: number;
  };
  progress: PlanProgress;
};

export type LessonDetail = {
  id: string;
  title: string;
  lesson_type: string;
  content: { body?: string; topic?: string };
  day_index: number;
  week_index: number;
  is_completed: boolean;
  completed_at: string | null;
};

export function getPlan(token: string, language?: string) {
  const q = language ? `?language=${encodeURIComponent(language)}` : "";
  return apiFetch<{ plan: StudyPlan | null; suggested_level: string | null }>(`/api/plan${q}`, { token });
}

export function createPlan(
  token: string,
  body: { language: string; cefr_level: string; duration_weeks: number }
) {
  return apiFetch<StudyPlan>("/api/plan", { method: "POST", token, body });
}

/** One-tap plan: the backend picks the level from the language profile. */
export function generatePlan(token: string, body: { language: string; duration_weeks: number }) {
  return apiFetch<StudyPlan>("/api/plan/generate", { method: "POST", token, body });
}

export function openLesson(token: string, day: number, language?: string) {
  const q = language ? `?language=${encodeURIComponent(language)}` : "";
  return apiFetch<LessonDetail>(`/api/plan/lessons/${day}${q}`, { token });
}

export function completeLesson(token: string, lessonId: string) {
  return apiFetch<{
    completed: boolean;
    already_completed: boolean;
    pending_vocab: number;
    progress: PlanProgress;
  }>(`/api/plan/lessons/${lessonId}/complete`, { method: "POST", token });
}
