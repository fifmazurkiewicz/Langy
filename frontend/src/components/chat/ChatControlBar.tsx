"use client";

import { ChatComposer } from "@/components/chat/ChatComposer";

type Props = {
  hasSession: boolean;
  startingSession: boolean;
  canStartSession: boolean;
  draft: string;
  sending: boolean;
  canStop?: boolean;
  onDraftChange: (value: string) => void;
  onSendText: () => void;
  onStop?: () => void;
  onStart: () => void;
  onEnd: () => void;
};

export function ChatControlBar({
  hasSession,
  startingSession,
  canStartSession,
  draft,
  sending,
  canStop,
  onDraftChange,
  onSendText,
  onStop,
  onStart,
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

  const inputDisabled = sending && !canStop;

  return (
    <div className="fixed inset-x-0 bottom-[calc(52px+env(safe-area-inset-bottom))] z-20 space-y-2 border-t border-[var(--color-divider)] bg-[var(--color-bg)] p-4">
      <ChatComposer
        draft={draft}
        disabled={inputDisabled}
        sending={sending}
        canStop={canStop}
        onDraftChange={onDraftChange}
        onSend={onSendText}
        onStop={onStop}
      />
      <button
        type="button"
        className="classical-btn w-full text-sm opacity-80"
        onClick={onEnd}
        disabled={sending && !canStop}
      >
        End session
      </button>
    </div>
  );
}
