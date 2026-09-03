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

export function ChatStage({
  visualState,
  hasSession,
  transcript,
  preSessionAction,
  presenceInteractive,
  presencePressed,
  onPresencePress,
}: Props) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 flex-col items-center gap-2 pt-2">
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
      {hasSession ? transcript : null}
    </div>
  );
}
