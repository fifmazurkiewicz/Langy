"use client";

import { useApiPulse } from "@/components/ApiPulseProvider";

/** Global non-blocking banner while the backend is cold-starting or offline. */
export function ApiPulseBanner() {
  const { isWaking, status, checkNow } = useApiPulse();

  if (!isWaking) return null;

  return (
    <div
      role="status"
      className="border-b border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_10%,var(--color-bg))] px-4 py-2 text-center text-sm"
    >
      {status === "checking" || status === "unknown" ? (
        <span>Waking up API…</span>
      ) : (
        <span className="inline-flex flex-wrap items-center justify-center gap-2">
          API unreachable — actions may fail until the server is back.
          <button type="button" className="classical-btn px-2 py-1 text-xs" onClick={() => void checkNow()}>
            Retry now
          </button>
        </span>
      )}
    </div>
  );
}
