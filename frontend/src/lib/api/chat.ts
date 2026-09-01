import { apiFetch } from "@/lib/api";

export type TranscriptLineDto = { role: "User" | "Agent"; text: string };

export type ConversationListItem = {
  id: string;
  language: string;
  started_at: string | null;
  ended_at: string | null;
  preview: string;
  summary?: string | null;
  is_active: boolean;
};

export function startChatSession(token: string, body: { language: string }) {
  return apiFetch<{
    conversation_id: string;
    language: string;
    opening_line: string;
    voice_mode: string;
  }>("/api/chat/sessions", { method: "POST", token, body });
}

export function getChatSession(token: string, conversationId: string) {
  return apiFetch<{
    conversation_id: string;
    language: string;
    transcript: string;
    lines: TranscriptLineDto[];
    ended: boolean;
    started_at: string | null;
    ended_at: string | null;
  }>(`/api/chat/sessions/${conversationId}`, { token });
}

export function appendChatLine(
  token: string,
  conversationId: string,
  body: { role: "User" | "Agent"; text: string }
) {
  return apiFetch<{ transcript: string }>(`/api/chat/sessions/${conversationId}/lines`, {
    method: "POST",
    token,
    body,
  });
}

export function endChatSession(token: string, conversationId: string) {
  return apiFetch<{ ok: boolean; job_id: string | null }>(
    `/api/chat/sessions/${conversationId}/end`,
    { method: "POST", token }
  );
}

export function listChatConversations(token: string, language?: string) {
  const q = language ? `?language=${encodeURIComponent(language)}` : "";
  return apiFetch<{ conversations: ConversationListItem[] }>(`/api/chat/conversations${q}`, {
    token,
  });
}

export function deleteChatConversation(token: string, conversationId: string) {
  return apiFetch<{ ok: boolean }>(`/api/chat/conversations/${conversationId}`, {
    method: "DELETE",
    token,
  });
}

export function resumeChatSession(token: string, conversationId: string) {
  return apiFetch<{
    conversation_id: string;
    language: string;
    lines: TranscriptLineDto[];
    opening_line: string;
    resumed: boolean;
    voice_mode: string;
  }>(`/api/chat/sessions/${conversationId}/resume`, { method: "POST", token });
}

export function chainedTurn(
  token: string,
  body: { text: string; language?: string; conversation_id?: string }
) {
  return apiFetch<{
    agent_reply: string;
    correction: { is_corrected: boolean; corrected_text?: string; explanation_pl?: string };
  }>("/api/chat/chained-turn", { method: "POST", token, body });
}

export function saveWord(
  token: string,
  conversationId: string,
  body: { term: string; translation: string; context?: string }
) {
  return apiFetch<{ vocab_id: string; status: string }>(
    `/api/chat/sessions/${conversationId}/save-word`,
    { method: "POST", token, body }
  );
}
