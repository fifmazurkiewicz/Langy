"use client";

import type { ChatVisualState } from "@/components/chat/AgentPresence";

const STATUS: Record<
  ChatVisualState,
  { title: string; subtitle: string }
> = {
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
};

export function ChatStatus({ state }: Props) {
  const { title, subtitle } = STATUS[state];
  return (
    <div className="text-center" role="status" aria-live="polite">
      <p className="font-serif text-3xl leading-tight">{title}</p>
      <p className="mt-2 max-w-xs text-sm text-[var(--color-soft)]">{subtitle}</p>
    </div>
  );
}
