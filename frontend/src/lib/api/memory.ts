import { apiFetch } from "@/lib/api";

export type MemoryFact = {
  id: string;
  content: string;
  source_conversation_id: string | null;
  updated_at: string | null;
};

export type SessionSummary = {
  id: string;
  conversation_id: string;
  language: string;
  summary: string;
  created_at: string | null;
};

export function fetchMemoryFacts(token: string) {
  return apiFetch<{ facts: MemoryFact[] }>("/api/memory/facts", { token });
}

export function updateMemoryFact(token: string, factId: string, content: string) {
  return apiFetch<{ ok: boolean }>(`/api/memory/facts/${factId}`, {
    method: "PATCH",
    token,
    body: { content },
  });
}

export function deleteMemoryFact(token: string, factId: string) {
  return apiFetch<{ ok: boolean }>(`/api/memory/facts/${factId}`, {
    method: "DELETE",
    token,
  });
}

export function fetchSessionSummaries(token: string, language?: string) {
  const q = language ? `?language=${encodeURIComponent(language)}` : "";
  return apiFetch<{ summaries: SessionSummary[] }>(`/api/memory/summaries${q}`, { token });
}
