"use client";

import { ClassicalBottomSheet } from "@/components/chat/ClassicalBottomSheet";

type Props = {
  open: boolean;
  mode: "end" | "switch";
  onConfirm: () => void;
  onCancel: () => void;
};

export function EndSessionSheet({ open, mode, onConfirm, onCancel }: Props) {
  const title = mode === "switch" ? "End current session?" : "End session?";
  const body =
    mode === "switch"
      ? "You have an active session. End it before continuing another conversation."
      : "Your transcript will be saved. You can continue this conversation later from History.";

  return (
    <ClassicalBottomSheet
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <div className="flex gap-2">
          <button type="button" className="classical-btn flex-1" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="classical-btn classical-btn-primary flex-1" onClick={onConfirm}>
            End session
          </button>
        </div>
      }
    >
      <p className="text-sm text-[var(--color-soft)]">{body}</p>
    </ClassicalBottomSheet>
  );
}
