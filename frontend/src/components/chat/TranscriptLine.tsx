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
};

export function TranscriptLine({
  role,
  text,
  lineIndex,
  enabled,
  correction,
  onSelect,
  onAddFromCorrection,
}: Props) {
  const handleSelect = () => {
    if (!enabled) return;
    const sel = window.getSelection()?.toString().trim();
    if (sel) onSelect(sel, lineIndex, role);
  };

  return (
    <div className={role === "User" ? "text-right" : "text-left"}>
      <p
        className={`text-sm leading-relaxed ${role === "Agent" ? "text-[var(--color-soft)]" : ""}`}
        onMouseUp={handleSelect}
        onTouchEnd={handleSelect}
      >
        {text}
      </p>
      {role === "User" && correction ? (
        <CorrectionTip tip={correction} onAdd={() => onAddFromCorrection(lineIndex)} />
      ) : null}
    </div>
  );
}
