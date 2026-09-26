/** Pause after last speech fragment before committing a user turn (ms). */
export const SPEECH_END_SILENCE_MS = 2500;

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
type DeferHandler = (text: string) => Promise<boolean>;

/**
 * Chrome may expose each revision of one phrase as another result entry.
 * Keep the newest complete-prefix revision instead of sending it twice.
 */
function transcriptFromResults(results: SpeechRecognitionResultList): string {
  let transcript = "";

  for (let i = 0; i < results.length; i += 1) {
    const fragment = results[i][0]?.transcript?.trim();
    if (!fragment) continue;

    if (!transcript || fragment.toLocaleLowerCase().startsWith(transcript.toLocaleLowerCase())) {
      transcript = fragment;
    } else {
      transcript = `${transcript} ${fragment}`;
    }
  }

  return transcript;
}

/** Hands-free VAD-style turn taking: debounce finals until the user pauses. */
export function bindDebouncedContinuousRecognition(
  recognition: SpeechRecognition,
  onUtterance: UtteranceHandler,
  silenceMs = SPEECH_END_SILENCE_MS,
  shouldDefer?: DeferHandler
): () => void {
  let silenceTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingText = "";
  let committed = false;

  recognition.interimResults = true;
  recognition.continuous = true;

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    if (committed) return;
    pendingText = transcriptFromResults(event.results);
    if (!pendingText) return;

    if (silenceTimer) clearTimeout(silenceTimer);
    silenceTimer = setTimeout(() => {
      const text = pendingText.trim();
      silenceTimer = null;
      if (!text) return;
      if (!shouldDefer) {
        committed = true;
        pendingText = "";
        onUtterance(text);
        return;
      }
      // Keep recording during the advisory decision. New speech replaces this snapshot.
      void shouldDefer(text).then((defer) => {
        if (committed || pendingText !== text) return;
        if (!defer) {
          committed = true;
          pendingText = "";
          onUtterance(text);
          return;
        }
        silenceTimer = setTimeout(() => {
          if (committed || pendingText !== text) return;
          committed = true;
          pendingText = "";
          onUtterance(text);
        }, Math.max(500, Math.min(silenceMs, 10000)));
      });
    }, Math.max(500, Math.min(silenceMs, 10000)));
  };

  return () => {
    if (silenceTimer) clearTimeout(silenceTimer);
    silenceTimer = null;
    pendingText = "";
    committed = true;
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
    pendingText = transcriptFromResults(event.results);
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
