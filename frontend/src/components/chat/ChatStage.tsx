"use client";

import type { ReactNode } from "react";
import type { ChatVisualState } from "@/components/chat/AgentPresence";
import { AgentPresence } from "@/components/chat/AgentPresence";
import { ChatStatus } from "@/components/chat/ChatStatus";

type Props = {
  visualState: ChatVisualState;
  hasSession: boolean;
  transcript: ReactNode;
  preSessionAction?: ReactNode;
  presenceInteractive?: boolean;
  presencePressed?: boolean;
  onPresencePress?: () => void;
};

/** Presence + status scroll with the transcript (one scroll surface). */
export function ChatStage({
  visualState,
  hasSession,
  transcript,
  preSessionAction,
  presenceInteractive,
  presencePressed,
  onPresencePress,
}: Props) {
  const presence = (
    <div className="flex flex-col items-center gap-2 px-1 pt-2 pb-3">
      <AgentPresence
        state={visualState}
        hasSession={hasSession}
        interactive={presenceInteractive}
        pressed={presencePressed}
        onPress={onPresencePress}
      />
      <ChatStatus state={visualState} />
      {!hasSession && preSessionAction ? <div className="mt-2">{preSessionAction}</div> : null}
    </div>
  );

  if (!hasSession) {
    return <div className="flex min-h-0 flex-1 flex-col gap-4">{presence}</div>;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto border-y border-[var(--color-divider)]">
        {presence}
        <div className="px-1 pb-3">{transcript}</div>
      </div>
    </div>
  );
}
