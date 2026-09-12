"use client";

import { useEffect, useRef, useState } from "react";
import { TOAST_EVENT, type ToastDetail } from "@/lib/uiFeedback";

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastDetail | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const handleToast = (event: Event) => {
      const detail = (event as CustomEvent<ToastDetail>).detail;
      setToast(detail);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setToast(null), 4200);
    };
    window.addEventListener(TOAST_EVENT, handleToast);
    return () => {
      window.removeEventListener(TOAST_EVENT, handleToast);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <>
      {children}
      {toast ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(68px+env(safe-area-inset-bottom))] z-[70] flex justify-center px-4" role="status" aria-live="polite">
          <div
            className={`pointer-events-auto max-w-md rounded-lg border bg-[var(--color-surface)] px-4 py-3 text-sm ${
              toast.tone === "error"
                ? "border-[var(--color-danger)]"
                : toast.tone === "success"
                  ? "border-[var(--color-success)]"
                  : "border-[var(--color-divider)]"
            }`}
          >
            <span>{toast.message}</span>
            <button type="button" className="ml-4 font-semibold" onClick={() => setToast(null)} aria-label="Dismiss notification">
              Close
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
