"use client";

import type { CorrectionResponse } from "@/lib/api/correction";
import { CorrectionTip } from "@/components/chat/CorrectionTip";

type Props = {
  role: "User" | "Agent";
  text: string;
  lineIndex: number;
  enabled: boolean;
  correction?: CorrectionResponse;
  onSelect: (text: string, lineIndex: number, role: "User" | "Agent") => void;
  onAddFromCorrection: (lineIndex: number) => void;
  onRespeak?: (text: string) => void;
};

export function TranscriptLine({
  role,
  text,
  lineIndex,
  enabled,
  correction,
  onSelect,
  onAddFromCorrection,
  onRespeak,
}: Props) {
  const handleSelect = () => {
    if (!enabled) return;
    const sel = window.getSelection()?.toString().trim();
    if (sel) onSelect(sel, lineIndex, role);
  };

  return (
    <div className={role === "User" ? "text-right" : "text-left"}>
      <div className={`flex items-start gap-2 ${role === "User" ? "justify-end" : "justify-start"}`}>
        {role === "Agent" && onRespeak ? (
          <button
            type="button"
            className="mt-0.5 shrink-0 rounded p-1 text-[var(--color-accent)] opacity-80 hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
            aria-label="Speak this line"
            title="Speak this line"
            onClick={() => onRespeak(text)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M11 5L6 9H3v6h3l5 4V5z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M15.5 8.5a4 4 0 010 7M18 6a7 7 0 010 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        ) : null}
        <p
          className={`text-sm leading-relaxed ${role === "Agent" ? "text-[var(--color-soft)]" : ""}`}
          onMouseUp={handleSelect}
          onTouchEnd={handleSelect}
        >
          {text}
        </p>
      </div>
      {role === "User" && correction ? (
        <CorrectionTip tip={correction} onAdd={() => onAddFromCorrection(lineIndex)} />
      ) : null}
    </div>
  );
}
