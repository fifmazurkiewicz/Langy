/** Pause after last speech fragment before committing a user turn (ms). */
export const SPEECH_END_SILENCE_MS = 1500;

export function speechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.SpeechRecognition ?? window.webkitSpeechRecognition);
}

type SpeechRecognitionCtor = new () => SpeechRecognition;

export function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
  return ctor ?? null;
}

type UtteranceHandler = (text: string) => void;

/** Hands-free VAD-style turn taking: debounce finals until the user pauses. */
export function bindDebouncedContinuousRecognition(
  recognition: SpeechRecognition,
  onUtterance: UtteranceHandler
): () => void {
  let silenceTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingText = "";

  recognition.interimResults = true;
  recognition.continuous = true;

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    let chunk = "";
    for (let i = 0; i < event.results.length; i += 1) {
      chunk += event.results[i][0].transcript;
    }
    pendingText = chunk.trim();
    if (!pendingText) return;

    if (silenceTimer) clearTimeout(silenceTimer);
    silenceTimer = setTimeout(() => {
      const text = pendingText.trim();
      pendingText = "";
      silenceTimer = null;
      if (text) onUtterance(text);
    }, SPEECH_END_SILENCE_MS);
  };

  return () => {
    if (silenceTimer) clearTimeout(silenceTimer);
    silenceTimer = null;
    pendingText = "";
  };
}

/** Single utterance while listening toggle stays off. */
export function runOneShotRecognition(
  lang: string,
  onUtterance: UtteranceHandler,
  onError?: (code: string) => void
): SpeechRecognition | null {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) return null;

  const recognition = new Ctor();
  recognition.lang = lang;
  recognition.interimResults = false;
  recognition.continuous = false;
  recognition.onresult = (event: SpeechRecognitionEvent) => {
    const text = event.results[0]?.[0]?.transcript?.trim();
    if (text) onUtterance(text);
  };
  recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
    onError?.(event.error);
  };
  recognition.start();
  return recognition;
}

export type DebouncedRecognitionHandle = {
  recognition: SpeechRecognition;
  stop: () => void;
};

/**
 * Shadowing-friendly capture: debounced continuous STT with manual stop.
 * MVP fallback until provider STT endpointing (see STT_END_SILENCE_MS env).
 */
export function runDebouncedRecognition(
  lang: string,
  silenceMs: number,
  onUtterance: UtteranceHandler,
  onError?: (code: string) => void
): DebouncedRecognitionHandle | null {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) return null;

  const recognition = new Ctor();
  recognition.lang = lang;
  let silenceTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingText = "";
  let stopped = false;

  const commit = () => {
    const text = pendingText.trim();
    pendingText = "";
    if (silenceTimer) {
      clearTimeout(silenceTimer);
      silenceTimer = null;
    }
    if (!stopped) {
      stopped = true;
      try {
        recognition.stop();
      } catch {
        /* ignore */
      }
    }
    if (text) onUtterance(text);
  };

  const scheduleCommit = () => {
    if (silenceTimer) clearTimeout(silenceTimer);
    silenceTimer = setTimeout(() => {
      silenceTimer = null;
      if (!stopped) commit();
    }, silenceMs);
  };

  recognition.interimResults = true;
  recognition.continuous = true;
  recognition.onresult = (event: SpeechRecognitionEvent) => {
    let chunk = "";
    for (let i = 0; i < event.results.length; i += 1) {
      chunk += event.results[i][0].transcript;
    }
    pendingText = chunk.trim();
    if (!pendingText) return;
    scheduleCommit();
  };
  recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
    onError?.(event.error);
  };

  recognition.start();

  return {
    recognition,
    stop: () => {
      stopped = true;
      try {
        recognition.stop();
      } catch {
        /* ignore */
      }
      commit();
    },
  };
}
