"use client";

export type ChatVisualState = "idle" | "listening" | "thinking" | "speaking" | "waking";

type Props = {
  state: ChatVisualState;
  hasSession: boolean;
};

export function AgentPresence({ state, hasSession }: Props) {
  const active = hasSession && state !== "idle" && state !== "waking";
  const speed = state === "thinking" ? "2.8s" : state === "speaking" ? "3.2s" : "5.2s";

  return (
    <div className="flex justify-center py-2" aria-hidden="true">
      <svg width="140" height="140" viewBox="0 0 200 200" fill="none">
        <circle
          cx="100"
          cy="100"
          r="88"
          stroke="var(--color-accent)"
          strokeWidth="0.75"
          opacity={active ? 0.35 : 0.2}
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
          opacity={active ? 0.5 : 0.3}
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
          opacity={active ? 0.75 : 0.45}
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
          opacity={active ? 0.9 : 0.55}
          style={{
            transformOrigin: "100px 100px",
            animation: `langyBreathe ${speed} ease-in-out infinite 0.6s`,
          }}
        />
      </svg>
    </div>
  );
}
