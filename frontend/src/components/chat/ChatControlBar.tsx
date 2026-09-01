"use client";

import { ChatComposer } from "@/components/chat/ChatComposer";

type Props = {
  hasSession: boolean;
  listening: boolean;
  startingSession: boolean;
  canStartSession: boolean;
  draft: string;
  sending: boolean;
  speakOnceActive: boolean;
  speechAvailable: boolean;
  onDraftChange: (value: string) => void;
  onSendText: () => void;
  onSpeakOnce: () => void;
  onStart: () => void;
  onToggleListening: () => void;
  onEnd: () => void;
};

export function ChatControlBar({
  hasSession,
  listening,
  startingSession,
  canStartSession,
  draft,
  sending,
  speakOnceActive,
  speechAvailable,
  onDraftChange,
  onSendText,
  onSpeakOnce,
  onStart,
  onToggleListening,
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
        onDraftChange={onDraftChange}
        onSend={onSendText}
        onSpeakOnce={onSpeakOnce}
      />
      <div className="flex gap-2">
        <button
          type="button"
          className={`classical-btn flex-1 ${listening ? "classical-btn-primary" : ""}`}
          onClick={onToggleListening}
          aria-pressed={listening}
          disabled={inputDisabled}
        >
          {listening ? "Listening on" : "Listening off"}
        </button>
        <button type="button" className="classical-btn flex-1 opacity-80" onClick={onEnd} disabled={sending}>
          End session
        </button>
      </div>
    </div>
  );
}
