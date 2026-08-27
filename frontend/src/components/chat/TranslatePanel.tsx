"use client";

import type { TranslateSelectionResponse } from "@/lib/api/selection";

type Props = {
  result: TranslateSelectionResponse;
  loading: boolean;
  error: string | null;
  onAdd: () => void;
  onClose: () => void;
  onRetry: () => void;
};

export function TranslatePanel({ result, loading, error, onAdd, onClose, onRetry }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4">
      <div className="classical-card w-full max-w-lg space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-serif">Translate</h2>
          <button type="button" className="classical-btn px-2 py-1 text-sm" onClick={onClose}>
            Close
          </button>
        </div>
        {loading ? <p>Loading…</p> : null}
        {error ? (
          <div className="space-y-2">
            <p className="text-sm text-red-400">{error}</p>
            <button type="button" className="classical-btn" onClick={onRetry}>
              Retry
            </button>
          </div>
        ) : null}
        {!loading && !error ? (
          <>
            <p className="font-serif text-xl">{result.span}</p>
            <p>{result.translation_pl}</p>
            <p className="text-sm opacity-80">{result.example_l2}</p>
            <p className="text-sm opacity-70">{result.example_pl}</p>
            {result.from_cache ? <p className="text-xs opacity-50">From cache</p> : null}
            <button type="button" className="classical-btn classical-btn-primary w-full" onClick={onAdd}>
              Add to learning
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
