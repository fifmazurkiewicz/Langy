"use client";

import { useState } from "react";
import type { CorrectionResponse } from "@/lib/api/correction";

type Props = {
  tip: CorrectionResponse;
  onAdd: () => void;
};

export function CorrectionTip({ tip, onAdd }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (!tip.is_corrected || !tip.corrected_text) return null;

  return (
    <div className="ml-4 mt-1 border-l-2 border-[var(--color-accent)] pl-3 text-xs">
      <button
        type="button"
        className="text-left w-full"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="font-serif">{tip.corrected_text}</span>
        {tip.mistake_type ? (
          <span className="ml-2 rounded border border-[var(--color-divider)] px-1.5 py-0.5 text-[10px]">
            {tip.mistake_type}
          </span>
        ) : null}
      </button>
      {expanded && tip.explanation_pl ? (
        <p className="mt-1 opacity-80">{tip.explanation_pl}</p>
      ) : null}
      <button type="button" className="classical-btn mt-2 px-2 py-1 text-[11px]" onClick={onAdd}>
        Add to learning
      </button>
    </div>
  );
}
