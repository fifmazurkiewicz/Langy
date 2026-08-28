import { apiFetch } from "@/lib/api";

export type DialogueLine = { id: string; role: string; text: string };

export type ShadowingSession = {
  session_id: string;
  dialogue: DialogueLine[];
  show_text: boolean;
  audio_mode: string;
};

export function startShadowingSession(
  token: string,
  body: {
    language: string;
    topic?: string;
    conversation_id?: string;
    show_text: boolean;
    audio_mode: "tts" | "live";
  }
) {
  return apiFetch<ShadowingSession>("/api/shadowing/sessions", { method: "POST", token, body });
}

export function submitShadowingTurn(
  token: string,
  sessionId: string,
  body: { line_id: string; user_transcript: string }
) {
  return apiFetch<{ ok: boolean; corrected_text?: string; explanation_pl?: string; mark_hard: boolean }>(
    `/api/shadowing/sessions/${sessionId}/turns`,
    { method: "POST", token, body }
  );
}

export function endShadowingSession(token: string, sessionId: string) {
  return apiFetch<{ created: number }>(`/api/shadowing/sessions/${sessionId}/end`, {
    method: "POST",
    token,
  });
}

export function addShadowingPending(token: string, sessionId: string, lineIds: string[]) {
  return apiFetch<{ created: number }>(`/api/shadowing/sessions/${sessionId}/pending`, {
    method: "POST",
    token,
    body: { line_ids: lineIds },
  });
}

export function listShadowingConversations(token: string, language?: string) {
  const q = language ? `?language=${encodeURIComponent(language)}` : "";
  return apiFetch<{ conversations: { id: string; preview: string }[] }>(
    `/api/shadowing/conversations${q}`,
    { token }
  );
}
