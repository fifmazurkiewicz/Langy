"use client";

export type MicStatus = "off" | "ready" | "blocked" | "unsupported";

type Props = {
  status: MicStatus;
  hasSession: boolean;
  onDismissBlocked?: () => void;
};

export function MicStatusBanner({ status, hasSession, onDismissBlocked }: Props) {
  if (!hasSession) return null;

  if (status === "unsupported") {
    return (
      <div className="classical-card border-[var(--color-accent)] p-3 text-sm">
        <p className="font-serif">Speech not supported in this browser</p>
        <p className="mt-1 opacity-80">Use Chrome or Edge for voice input.</p>
      </div>
    );
  }

  if (status === "blocked") {
    return (
      <div className="classical-card border-[var(--color-accent)] p-4 text-sm">
        <p className="font-serif text-lg">Microphone blocked</p>
        <p className="mt-1 opacity-80">
          Allow microphone access in your browser settings, then turn Listening on again.
        </p>
        {onDismissBlocked ? (
          <button type="button" className="classical-btn mt-3" onClick={onDismissBlocked}>
            Dismiss
          </button>
        ) : null}
      </div>
    );
  }

  return null;
}
