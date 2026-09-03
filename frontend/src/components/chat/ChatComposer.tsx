"use client";

type Props = {
  draft: string;
  disabled: boolean;
  sending: boolean;
  /** When true, primary action is Stop (tutor speaking/thinking). */
  canStop?: boolean;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onStop?: () => void;
};

export function ChatComposer({
  draft,
  disabled,
  sending,
  canStop,
  onDraftChange,
  onSend,
  onStop,
}: Props) {
  const canSend = draft.trim().length > 0 && !disabled && !sending && !canStop;

  return (
    <div className="flex items-end gap-2">
      <input
        type="text"
        className="classical-input min-w-0 flex-1"
        placeholder="Type a message…"
        value={draft}
        disabled={disabled || sending || Boolean(canStop)}
        onChange={(e) => onDraftChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && canSend) {
            e.preventDefault();
            onSend();
          }
        }}
        aria-label="Type a message"
      />
      {canStop ? (
        <button
          type="button"
          className="classical-btn classical-btn-primary shrink-0 px-3"
          onClick={onStop}
          aria-label="Stop speaking"
        >
          Stop
        </button>
      ) : (
        <button
          type="button"
          className="classical-btn classical-btn-primary shrink-0 px-3"
          disabled={!canSend}
          onClick={onSend}
          aria-label="Send message"
        >
          {sending ? "…" : "Send"}
        </button>
      )}
    </div>
  );
}
