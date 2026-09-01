"use client";

import { useApiPulse } from "@/components/ApiPulseProvider";

/** Compact API liveness indicator (Render cold start). */
export function ApiStatusIndicator() {
  const { status, isHealthy, checkNow } = useApiPulse();

  const label =
    status === "unknown" || status === "checking"
      ? "Checking API…"
      : isHealthy
        ? "API ready"
        : "Waking up API…";

  const dotClass = isHealthy
    ? "bg-emerald-500/90"
    : status === "unhealthy"
      ? "bg-amber-400 animate-pulse"
      : "bg-[var(--color-soft)] animate-pulse";

  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-4 flex items-center justify-center gap-2 text-xs opacity-75"
    >
      <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${dotClass}`} aria-hidden />
      <span>{label}</span>
      {status === "unhealthy" && (
        <button type="button" className="classical-btn px-2 py-0.5 text-[10px]" onClick={() => void checkNow()}>
          Retry
        </button>
      )}
    </div>
  );
}
