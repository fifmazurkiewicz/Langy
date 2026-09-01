import type { TtsLineResponse, VoiceConfig } from "@/lib/api/voice";
import { fetchTts } from "@/lib/api/voice";

let activeAudio: HTMLAudioElement | null = null;

function pickBrowserVoice(language: string, voiceNameHint?: string): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (voiceNameHint) {
    const hint = voiceNameHint.toLowerCase();
    const byName = voices.find((v) => v.name.toLowerCase().includes(hint));
    if (byName) return byName;
  }
  const lang = language.startsWith("en") ? "en-GB" : language;
  return voices.find((v) => v.lang === lang) ?? voices.find((v) => v.lang.startsWith(lang.split("-")[0])) ?? null;
}

export function stopActiveTtsAudio(): void {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.src = "";
    activeAudio = null;
  }
}

/** Legacy browser-only path — use speakTutorLine in product code. */
export function speakBrowserLine(text: string, language: string, voiceNameHint?: string): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  stopActiveTtsAudio();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language.startsWith("en") ? "en-GB" : language;
  const voice = pickBrowserVoice(language, voiceNameHint);
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}

export async function playServerTtsAudio(response: TtsLineResponse): Promise<void> {
  if (!response.audio_base64 || !response.content_type) {
    throw new Error("No server audio in TTS response");
  }
  stopActiveTtsAudio();
  const binary = atob(response.audio_base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: response.content_type });
  const url = URL.createObjectURL(blob);
  try {
    await new Promise<void>((resolve, reject) => {
      const audio = new Audio(url);
      activeAudio = audio;
      audio.onended = () => {
        activeAudio = null;
        resolve();
      };
      audio.onerror = () => {
        activeAudio = null;
        reject(new Error("Could not play TTS audio"));
      };
      void audio.play().catch(reject);
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Server TTS when configured; browser only if TTS_PROVIDER=browser; otherwise silent. */
export async function speakTutorLine(
  text: string,
  language: string,
  token: string,
  voiceConfig: VoiceConfig
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;

  if (voiceConfig.tts_provider === "elevenlabs" && voiceConfig.tts_configured) {
    const tts = await fetchTts(token, { text: trimmed, language });
    await playServerTtsAudio(tts);
    return;
  }

  if (voiceConfig.tts_provider === "browser") {
    speakBrowserLine(trimmed, language, voiceConfig.tts_voice_name);
  }
}
