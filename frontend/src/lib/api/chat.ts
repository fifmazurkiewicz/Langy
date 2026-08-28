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
