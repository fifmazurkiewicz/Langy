"use client";

import type { ChatVisualState } from "@/components/chat/AgentPresence";

const STATUS: Record<ChatVisualState, { title: string; subtitle: string }> = {
  waking: {
    title: "Waking up…",
    subtitle: "The API is starting — this can take a moment.",
  },
  idle: {
    title: "Ready when you are",
    subtitle: "Type below, tap Speak, or turn on listening for hands-free chat.",
  },
  listening: {
    title: "Listening",
    subtitle: "Speak in your target language.",
  },
  thinking: {
    title: "Thinking",
    subtitle: "Processing your message…",
  },
  speaking: {
    title: "Speaking",
    subtitle: "Agent is responding…",
  },
};

type Props = {
  state: ChatVisualState;
  /** Single-line title for the locked status row. */
  compact?: boolean;
};

export function ChatStatus({ state, compact = false }: Props) {
  const { title, subtitle } = STATUS[state];
  if (compact) {
    return (
      <div className="min-w-0 text-left" role="status" aria-live="polite">
        <p className="truncate font-serif text-xl leading-tight sm:text-2xl">{title}</p>
        <p className="truncate text-xs text-[var(--color-soft)] sm:text-sm">{subtitle}</p>
      </div>
    );
  }
  return (
    <div className="text-center" role="status" aria-live="polite">
      <p className="font-serif text-3xl leading-tight">{title}</p>
      <p className="mt-2 max-w-xs text-sm text-[var(--color-soft)]">{subtitle}</p>
    </div>
  );
}
