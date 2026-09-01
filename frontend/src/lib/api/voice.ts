import { apiFetch } from "@/lib/api";

export type VoiceOption = {
  key: string;
  label: string;
  description: string;
  is_default: boolean;
  is_custom?: boolean;
};

export type VoiceConfig = {
  tts_provider: "browser" | "elevenlabs";
  tts_configured: boolean;
  tts_voice_name?: string;
  stt_end_silence_ms: number;
  language?: string;
  preview_sample?: string;
  voices?: VoiceOption[];
  tts_voice_key?: string;
  tts_custom_voice_id?: string | null;
};

export type VoiceCatalog = {
  language: string;
  preview_sample: string;
  voices: VoiceOption[];
};

export type TtsLineResponse = {
  provider: string;
  text: string;
  configured: boolean;
  voice_name?: string;
  content_type?: string;
  audio_base64?: string;
  voice_key?: string;
};

export function fetchVoiceConfig(token: string, language?: string) {
  const q = language ? `?language=${encodeURIComponent(language)}` : "";
  return apiFetch<VoiceConfig>(`/api/voice/config${q}`, { token });
}

export function fetchVoiceCatalog(token: string, language: string) {
  return apiFetch<VoiceCatalog>(`/api/voice/catalog?language=${encodeURIComponent(language)}`, { token });
}

export function fetchTts(
  token: string,
  body: { text: string; language?: string; voice_key?: string; custom_voice_id?: string }
) {
  return apiFetch<TtsLineResponse>("/api/voice/synthesize", {
    method: "POST",
    token,
    body,
  });
}

export function fetchShadowingTts(token: string, sessionId: string, lineId: string) {
  return apiFetch<TtsLineResponse>(`/api/shadowing/sessions/${sessionId}/tts`, {
    method: "POST",
    token,
    body: { line_id: lineId },
  });
}
