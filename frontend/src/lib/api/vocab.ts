import { apiFetch } from "@/lib/api";

export function listAcceptedVocab(token: string, language?: string) {
  const q = language ? `?language=${encodeURIComponent(language)}` : "";
  return apiFetch<{
    items: {
      id: string;
      term: string;
      translation: string;
      source: string;
      category_key?: string | null;
      context_sentence?: string | null;
    }[];
  }>(`/api/vocab/accepted${q}`, { token });
}

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

export function listDueCards(token: string, language?: string, categoryKey?: string) {
  const params = new URLSearchParams();
  if (language) params.set("language", language);
  if (categoryKey) params.set("category_key", categoryKey);
  const q = params.toString() ? `?${params}` : "";
  return apiFetch<{
    cards: { id: string; term: string; translation: string; category_key?: string | null }[];
  }>(`/api/vocab/due${q}`, { token });
}

export function listVocabCategories(token: string, language?: string) {
  const q = language ? `?language=${encodeURIComponent(language)}` : "";
  return apiFetch<{
    items: {
      id: string;
      category_key: string;
      accepted_count: number;
      due_count: number;
      is_custom: boolean;
    }[];
    other_due_count: number;
  }>(`/api/vocab/categories${q}`, { token });
}

export function generateCategory(token: string, setId: string) {
  return apiFetch<{ created: number }>(`/api/categories/${setId}/generate`, { method: "POST", token });
}

export function createCategory(token: string, body: { language: string; category_key: string }) {
  return apiFetch<{ id: string; category_key: string }>("/api/categories", {
    method: "POST",
    token,
    body,
  });
}

export function deleteVocab(token: string, vocabId: string) {
  return apiFetch<{ ok: boolean }>(`/api/vocab/${vocabId}`, { method: "DELETE", token });
}
