"use client";

import type { ReactNode } from "react";
import type { ChatVisualState } from "@/components/chat/AgentPresence";
import { AgentPresence } from "@/components/chat/AgentPresence";
import { ChatStatus } from "@/components/chat/ChatStatus";

type Props = {
  visualState: ChatVisualState;
  hasSession: boolean;
  transcript: ReactNode;
  /** Left of status row: Live Gemini / TTS lamp. */
  leftControls?: ReactNode;
  /** Right of status row: Tutor voice + Listening dots. */
  rightControls?: ReactNode;
  preSessionAction?: ReactNode;
  presenceInteractive?: boolean;
  presencePressed?: boolean;
  onPresencePress?: () => void;
};

/**
 * Locked status row (waves + title + dots on one level) + scroll-only transcript.
 * Header / composer / bottom nav stay outside this component.
 */
export function ChatStage({
  visualState,
  hasSession,
  transcript,
  leftControls,
  rightControls,
  preSessionAction,
  presenceInteractive,
  presencePressed,
  onPresencePress,
}: Props) {
  const statusRow = (
    <div className="flex shrink-0 items-center gap-1 border-b border-[var(--color-divider)] px-1 py-2 sm:gap-2">
      <div className="flex w-12 shrink-0 items-center justify-start sm:w-14">{leftControls}</div>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <AgentPresence
          state={visualState}
          hasSession={hasSession}
          size="sm"
          interactive={presenceInteractive}
          pressed={presencePressed}
          onPress={onPresencePress}
        />
        <ChatStatus state={visualState} compact />
      </div>
      <div className="flex w-[5.5rem] shrink-0 items-center justify-end sm:w-24">{rightControls}</div>
    </div>
  );

  if (!hasSession) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {statusRow}
        {preSessionAction ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-2 py-4">
            {preSessionAction}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {statusRow}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 py-3">{transcript}</div>
    </div>
  );
}
