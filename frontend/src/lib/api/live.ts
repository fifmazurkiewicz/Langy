import { apiFetch } from "@/lib/api";

export type LiveTokenResponse = {
  mode: "live" | "mock";
  token: string | null;
  model: string;
  api_version: string;
  configured: boolean;
  system_instruction?: string;
};

export function fetchLiveToken(
  token: string,
  body: { language?: string; conversation_id?: string }
) {
  return apiFetch<LiveTokenResponse>("/api/chat/live-token", {
    method: "POST",
    token,
    body,
  });
}

export function fetchLiveConfig(token: string) {
  return apiFetch<{ mode: string; configured: boolean; voice_mode: string }>("/api/chat/live-config", {
    token,
  });
}
