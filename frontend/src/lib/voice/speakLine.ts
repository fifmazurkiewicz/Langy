import { stopLivePcmPlayback } from "./livePcmPlayer";
import { speakTutorLine, stopActiveTtsAudio } from "./playTts";

export { speakTutorLine };

/** Stops browser/server TTS and any Live PCM playback. */
export function cancelSpeech(): void {
  stopActiveTtsAudio();
  stopLivePcmPlayback();
}

/** @deprecated Use speakTutorLine with voice config — kept for tests. */
export async function speakLine(text: string, language: string): Promise<void> {
  if (typeof window === "undefined" || !window.speechSynthesis || !text.trim()) {
    return;
  }
  stopActiveTtsAudio();
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language.startsWith("en") ? "en-GB" : language;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}
