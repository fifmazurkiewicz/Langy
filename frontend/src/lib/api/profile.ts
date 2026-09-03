import { apiFetch } from "@/lib/api";

export type LanguageProfile = {
  language: string;
  motivations: string[];
  interests: string[];
  skills: {
    reading: number | null;
    speaking: number | null;
    writing: number | null;
    listening: number | null;
    vocabulary: number | null;
  };
  cefr_level: string | null;
  tts_voice_key: string;
  tts_custom_voice_id: string | null;
  tts_playback_rate?: number;
};

export function fetchProfiles(token: string) {
  return apiFetch<{ active_language: string | null; profiles: LanguageProfile[] }>(
    "/api/profile/languages",
    { token }
  );
}

export function setActiveLanguage(token: string, active_language: string) {
  return apiFetch<{ active_language: string }>("/api/profile/active-language", {
    method: "PATCH",
    token,
    body: { active_language },
  });
}

export function addLanguage(
  token: string,
  body: {
    language: string;
    motivations?: string[];
    interests?: string[];
    skill_reading?: number;
    skill_speaking?: number;
    skill_writing?: number;
    skill_listening?: number;
    skill_vocabulary?: number;
    set_active?: boolean;
  }
) {
  return apiFetch<{ ok: boolean; language: string; active_language: string | null }>(
    "/api/profile/languages",
    { method: "POST", token, body }
  );
}

export function updateProfile(
  token: string,
  language: string,
  body: Partial<{
    motivations: string[];
    interests: string[];
    skill_reading: number;
    skill_speaking: number;
    skill_writing: number;
    skill_listening: number;
    skill_vocabulary: number;
    tts_voice_key: string;
    tts_custom_voice_id: string | null;
    tts_playback_rate: number;
  }>
) {
  return apiFetch<{ ok: boolean }>(`/api/profile/${encodeURIComponent(language)}`, {
    method: "PATCH",
    token,
    body,
  });
}
