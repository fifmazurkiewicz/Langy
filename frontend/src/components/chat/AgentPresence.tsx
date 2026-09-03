"use client";

export type ChatVisualState = "idle" | "listening" | "thinking" | "speaking" | "waking";

type Props = {
  state: ChatVisualState;
  hasSession: boolean;
  /** When true, waves act as Speak (hover + click). */
  interactive?: boolean;
  pressed?: boolean;
  onPress?: () => void;
};

export function AgentPresence({ state, hasSession, interactive, pressed, onPress }: Props) {
  const active = hasSession && state !== "idle" && state !== "waking";
  const speed = state === "thinking" ? "2.8s" : state === "speaking" ? "3.2s" : "5.2s";
  const canPress = Boolean(hasSession && interactive && onPress);

  const rings = (
    <svg width="140" height="140" viewBox="0 0 200 200" fill="none" aria-hidden="true">
      <circle
        cx="100"
        cy="100"
        r="88"
        stroke="var(--color-accent)"
        strokeWidth="0.75"
        opacity={active || canPress ? 0.35 : 0.2}
        style={{
          transformOrigin: "100px 100px",
          animation: `langyBreathe ${speed} ease-in-out infinite`,
        }}
      />
      <circle
        cx="100"
        cy="100"
        r="66"
        stroke="var(--color-accent)"
        strokeWidth="0.9"
        opacity={active || canPress ? 0.5 : 0.3}
        style={{
          transformOrigin: "100px 100px",
          animation: `langyBreathe ${speed} ease-in-out infinite 0.3s`,
        }}
      />
      <circle
        cx="100"
        cy="100"
        r="44"
        stroke="var(--color-accent)"
        strokeWidth="1.1"
        opacity={active || canPress ? 0.75 : 0.45}
        style={{
          transformOrigin: "100px 100px",
          animation: `langyBreathe ${speed} ease-in-out infinite 0.6s`,
        }}
      />
      <circle
        cx="100"
        cy="100"
        r="7"
        fill="var(--color-accent)"
        opacity={active || canPress ? 0.9 : 0.55}
        style={{
          transformOrigin: "100px 100px",
          animation: `langyBreathe ${speed} ease-in-out infinite 0.6s`,
        }}
      />
    </svg>
  );

  if (canPress) {
    return (
      <div className="flex justify-center py-2">
        <button
          type="button"
          className={`rounded-full p-1 transition duration-200 hover:scale-[1.04] hover:brightness-125 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] ${
            pressed ? "brightness-125" : "cursor-pointer opacity-90 hover:opacity-100"
          }`}
          onClick={onPress}
          aria-label="Speak"
          aria-pressed={pressed}
          title="Speak"
        >
          {rings}
        </button>
      </div>
    );
  }

  return (
    <div className="flex justify-center py-2" aria-hidden="true">
      {rings}
    </div>
  );
}
