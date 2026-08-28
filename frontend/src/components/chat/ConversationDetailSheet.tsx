"use client";

import type { TranscriptLineData } from "@/components/chat/TranscriptPane";
import { ClassicalBottomSheet } from "@/components/chat/ClassicalBottomSheet";
import { TranscriptLine } from "@/components/chat/TranscriptLine";

type Props = {
  open: boolean;
  title: string;
  lines: TranscriptLineData[];
  isActive: boolean;
  loading: boolean;
  onClose: () => void;
  onContinue: () => void;
  onReturnToSession: () => void;
};

export function ConversationDetailSheet({
  open,
  title,
  lines,
  isActive,
  loading,
  onClose,
  onContinue,
  onReturnToSession,
}: Props) {
  return (
    <ClassicalBottomSheet
      open={open}
      title={title}
      onClose={onClose}
      footer={
        isActive ? (
          <button type="button" className="classical-btn classical-btn-primary w-full" onClick={onReturnToSession}>
            Return to session
          </button>
        ) : (
          <button type="button" className="classical-btn classical-btn-primary w-full" onClick={onContinue}>
            Continue conversation
          </button>
        )
      }
    >
      {loading ? <p className="text-sm text-[var(--color-soft)]">Loading transcript…</p> : null}
      {!loading ? (
        <div className="flex flex-col gap-3">
          {lines.map((line, i) => (
            <TranscriptLine
              key={`${line.role}-${i}`}
              role={line.role}
              text={line.text}
              lineIndex={i}
              enabled={false}
              onSelect={() => undefined}
              onAddFromCorrection={() => undefined}
            />
          ))}
        </div>
      ) : null}
    </ClassicalBottomSheet>
  );
}
