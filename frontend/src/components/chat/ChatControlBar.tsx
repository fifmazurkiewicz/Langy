"use client";

type Props = {
  hasSession: boolean;
  listening: boolean;
  startingSession: boolean;
  canStartSession: boolean;
  onStart: () => void;
  onToggleListening: () => void;
  onEnd: () => void;
};

export function ChatControlBar({
  hasSession,
  listening,
  startingSession,
  canStartSession,
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

  return (
    <div className="fixed inset-x-0 bottom-[calc(52px+env(safe-area-inset-bottom))] z-20 flex gap-2 border-t border-[var(--color-divider)] bg-[var(--color-bg)] p-4">
      <button
        type="button"
        className={`classical-btn flex-1 ${listening ? "classical-btn-primary" : ""}`}
        onClick={onToggleListening}
        aria-pressed={listening}
      >
        {listening ? "Listening on" : "Listening off"}
      </button>
      <button type="button" className="classical-btn flex-1 opacity-80" onClick={onEnd}>
        End session
      </button>
    </div>
  );
}
