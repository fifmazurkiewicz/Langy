export type MicStatus = "off" | "ready" | "blocked" | "unsupported";

type Props = {
  status: MicStatus;
  listening: boolean;
  hasSession: boolean;
  onDismissBlocked?: () => void;
};

export function MicStatusBanner({ status, listening, hasSession, onDismissBlocked }: Props) {
  if (!hasSession) return null;

  if (status === "unsupported") {
    return (
      <div className="classical-card border-[var(--color-gold)] p-3 text-sm">
        <p className="font-serif">Speech not supported in this browser</p>
        <p className="mt-1 opacity-80">Use Chrome or Edge for voice input, or type in the transcript.</p>
      </div>
    );
  }

  if (status === "blocked") {
    return (
      <div className="classical-card border-[var(--color-gold)] p-4 text-sm">
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

  if (!listening) {
    return (
      <div className="classical-card p-3 text-sm opacity-90">
        <p>Listening is off — turn it on to speak.</p>
      </div>
    );
  }

  if (status === "ready") {
    return (
      <div className="classical-card p-3 text-sm opacity-80">
        <p>Listening… speak in your target language.</p>
      </div>
    );
  }

  return null;
}
