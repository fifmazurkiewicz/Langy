"use client";

type Props = {
  draft: string;
  disabled: boolean;
  sending: boolean;
  listening: boolean;
  speakOnceActive: boolean;
  speechAvailable: boolean;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onSpeakOnce: () => void;
};

export function ChatComposer({
  draft,
  disabled,
  sending,
  listening,
  speakOnceActive,
  speechAvailable,
  onDraftChange,
  onSend,
  onSpeakOnce,
}: Props) {
  const canSend = draft.trim().length > 0 && !disabled && !sending;
  const showSpeakOnce = !listening && speechAvailable;

  return (
    <div className="flex items-end gap-2">
      <input
        type="text"
        className="classical-input min-w-0 flex-1"
        placeholder="Type a message…"
        value={draft}
        disabled={disabled || sending}
        onChange={(e) => onDraftChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && canSend) {
            e.preventDefault();
            onSend();
          }
        }}
        aria-label="Type a message"
      />
      {showSpeakOnce ? (
        <button
          type="button"
          className={`classical-btn shrink-0 px-3 ${speakOnceActive ? "classical-btn-primary" : ""}`}
          disabled={disabled || sending || speakOnceActive}
          onClick={onSpeakOnce}
          aria-pressed={speakOnceActive}
          aria-label="Speak once"
        >
          {speakOnceActive ? "Listening…" : "Speak"}
        </button>
      ) : null}
      <button
        type="button"
        className="classical-btn classical-btn-primary shrink-0 px-3"
        disabled={!canSend}
        onClick={onSend}
        aria-label="Send message"
      >
        {sending ? "…" : "Send"}
      </button>
    </div>
  );
}
