"use client";

import { ChatComposer } from "@/components/chat/ChatComposer";

type Props = {
  hasSession: boolean;
  listening: boolean;
  tutorVoice: boolean;
  startingSession: boolean;
  canStartSession: boolean;
  draft: string;
  sending: boolean;
  speakOnceActive: boolean;
  speechAvailable: boolean;
  canStop?: boolean;
  onDraftChange: (value: string) => void;
  onSendText: () => void;
  onStop?: () => void;
  onSpeakOnce: () => void;
  onStart: () => void;
  onToggleListening: () => void;
  onToggleTutorVoice: () => void;
  onEnd: () => void;
};

export function ChatControlBar({
  hasSession,
  listening,
  tutorVoice,
  startingSession,
  canStartSession,
  draft,
  sending,
  speakOnceActive,
  speechAvailable,
  canStop,
  onDraftChange,
  onSendText,
  onStop,
  onSpeakOnce,
  onStart,
  onToggleListening,
  onToggleTutorVoice,
  onEnd,
}: Props) {
  if (!hasSession) {
    return (
      <div className="fixed inset-x-0 bottom-[calc(52px+env(safe-area-inset-bottom))] z-20 border-t border-[var(--color-divider)] bg-[var(--color-bg)] p-4">
        <button
          type="button"
          className="classical-btn classical-btn-primary w-full"
          disabled={!canStartSession}
          onClick={onStart}
        >
          {startingSession ? "Starting…" : "Start session"}
        </button>
      </div>
    );
  }

  const inputDisabled = sending || speakOnceActive;

  return (
    <div className="fixed inset-x-0 bottom-[calc(52px+env(safe-area-inset-bottom))] z-20 space-y-2 border-t border-[var(--color-divider)] bg-[var(--color-bg)] p-4">
      <ChatComposer
        draft={draft}
        disabled={inputDisabled}
        sending={sending}
        listening={listening}
        speakOnceActive={speakOnceActive}
        speechAvailable={speechAvailable}
        canStop={canStop}
        onDraftChange={onDraftChange}
        onSend={onSendText}
        onStop={onStop}
        onSpeakOnce={onSpeakOnce}
      />
      <div className="flex gap-2">
        <button
          type="button"
          className={`classical-btn flex-1 text-sm ${tutorVoice ? "classical-btn-primary" : ""}`}
          onClick={onToggleTutorVoice}
          aria-pressed={tutorVoice}
          disabled={sending && !canStop}
        >
          {tutorVoice ? "Tutor voice on" : "Tutor voice off"}
        </button>
        <button
          type="button"
          className={`classical-btn flex-1 text-sm ${listening ? "classical-btn-primary" : ""}`}
          onClick={onToggleListening}
          aria-pressed={listening}
          disabled={inputDisabled}
        >
          {listening ? "Listening on" : "Listening off"}
        </button>
        <button
          type="button"
          className="classical-btn flex-1 text-sm opacity-80"
          onClick={onEnd}
          disabled={sending}
        >
          End session
        </button>
      </div>
    </div>
  );
}
