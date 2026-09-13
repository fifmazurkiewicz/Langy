import { apiFetch } from "@/lib/api";

export const AI_NOTICE_VERSION = "2026-09-13";
export const AI_NOTICE_STORAGE_KEY = `langy-ai-notice-${AI_NOTICE_VERSION}`;
export const MIC_NOTICE_VERSION = "2026-09-13";
export const MIC_NOTICE_STORAGE_KEY = `langy-microphone-notice-${MIC_NOTICE_VERSION}`;

export function acknowledgePrivacyNotice(
  token: string,
  notice_key: "ai_first_use" | "microphone",
  notice_version: string
) {
  return apiFetch<{ ok: boolean }>("/api/privacy/notices/acknowledge", {
    method: "POST",
    token,
    body: { notice_key, notice_version },
  });
}

export function exportPersonalData(token: string) {
  return apiFetch<Record<string, unknown>>("/api/privacy/export", { token });
}

export function deleteAccount(token: string, confirmation: string) {
  return apiFetch<{ ok: boolean }>("/api/privacy/account", {
    method: "DELETE",
    token,
    body: { confirmation },
  });
}
