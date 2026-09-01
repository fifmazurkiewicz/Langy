"use client";

import type { ReactNode } from "react";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

export function ClassicalBottomSheet({ open, title, onClose, children, footer }: Props) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/40 pb-[calc(52px+env(safe-area-inset-bottom))]"
      role="presentation"
    >
      <button type="button" className="flex-1" aria-label="Close" onClick={onClose} />
      <div
        className="classical-card max-h-[85vh] overflow-hidden rounded-t-md border-b-0 shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-divider)] px-4 py-3">
          <h2 className="font-serif text-xl">{title}</h2>
          <button type="button" className="classical-btn min-h-[36px] px-3 py-1 text-sm" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-4">{children}</div>
        {footer ? <div className="border-t border-[var(--color-divider)] p-4">{footer}</div> : null}
      </div>
    </div>
  );
}
