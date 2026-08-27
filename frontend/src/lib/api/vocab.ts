import { apiFetch } from "@/lib/api";

export function exportQuizlet(token: string, language?: string, categoryKey?: string) {
  const params = new URLSearchParams();
  if (language) params.set("language", language);
  if (categoryKey) params.set("category_key", categoryKey);
  const q = params.toString() ? `?${params}` : "";
  return apiFetch<{ content: string; count: number }>(`/api/vocab/export${q}`, { token });
}

export function reviewCard(token: string, cardId: string, rating: "again" | "hard" | "good" | "easy") {
  return apiFetch<{ id: string; due_at: string }>(`/api/vocab/cards/${cardId}/review`, {
    method: "POST",
    token,
    body: { rating },
  });
}

export function listVocabCategories(token: string, language?: string) {
  const q = language ? `?language=${encodeURIComponent(language)}` : "";
  return apiFetch<{ items: { id: string; category_key: string; accepted_count: number }[] }>(
    `/api/vocab/categories${q}`,
    { token }
  );
}

export function generateCategory(token: string, setId: string) {
  return apiFetch<{ created: number }>(`/api/categories/${setId}/generate`, { method: "POST", token });
}
