"use client";

import { ClassicalBottomSheet } from "@/components/chat/ClassicalBottomSheet";

type Props = {
  open: boolean;
  pendingCount: number;
  onClose: () => void;
};

export function SessionSummarySheet({ open, pendingCount, onClose }: Props) {
  return (
    <ClassicalBottomSheet
      open={open}
      title="Session ended"
      onClose={onClose}
      footer={
        <button type="button" className="classical-btn classical-btn-primary w-full" onClick={onClose}>
          Done
        </button>
      }
    >
      {pendingCount > 0 ? (
        <>
          <p className="font-serif text-2xl">New words to review</p>
          <p className="mt-2 text-sm text-[var(--color-soft)]">
            {pendingCount} word{pendingCount === 1 ? "" : "s"} waiting in Memo → Pending.
          </p>
        </>
      ) : (
        <>
          <p className="font-serif text-2xl">Nice work</p>
          <p className="mt-2 text-sm text-[var(--color-soft)]">No new words from that chat.</p>
        </>
      )}
    </ClassicalBottomSheet>
  );
}
