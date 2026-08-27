import { apiFetch } from "@/lib/api";

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
};

export function getPlan(token: string, language?: string) {
  const q = language ? `?language=${encodeURIComponent(language)}` : "";
  return apiFetch<{ plan: StudyPlan | null }>(`/api/plan${q}`, { token });
}

export function createPlan(
  token: string,
  body: { language: string; cefr_level: string; duration_weeks: number }
) {
  return apiFetch<StudyPlan>("/api/plan", { method: "POST", token, body });
}

export function openLesson(token: string, day: number, language?: string) {
  const q = language ? `?language=${encodeURIComponent(language)}` : "";
  return apiFetch<{
    id: string;
    title: string;
    lesson_type: string;
    content: { body?: string; topic?: string };
    day_index: number;
    is_completed: boolean;
  }>(`/api/plan/lessons/${day}${q}`, { token });
}

export function completeLesson(token: string, lessonId: string) {
  return apiFetch<{ completed: boolean; pending_vocab: number }>(
    `/api/plan/lessons/${lessonId}/complete`,
    { method: "POST", token }
  );
}
