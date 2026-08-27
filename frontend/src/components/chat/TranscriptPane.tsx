"use client";

import { useCallback, useState } from "react";
import type { CorrectionResponse } from "@/lib/api/correction";
import { CorrectionTip } from "@/components/chat/CorrectionTip";

export type TranscriptLine = { role: "User" | "Agent"; text: string };

type Props = {
  lines: TranscriptLine[];
  enabled: boolean;
  corrections: Record<number, CorrectionResponse>;
  onSelect: (text: string, lineIndex: number, role: "User" | "Agent") => void;
  onAddFromCorrection: (lineIndex: number) => void;
};

export function TranscriptPane({
  lines,
  enabled,
  corrections,
  onSelect,
  onAddFromCorrection,
}: Props) {
  const [selectedText, setSelectedText] = useState("");

  const handleMouseUp = useCallback(
    (lineIndex: number, role: "User" | "Agent") => {
      if (!enabled) return;
      const sel = window.getSelection()?.toString().trim();
      if (sel) {
        setSelectedText(sel);
        onSelect(sel, lineIndex, role);
      }
    },
    [enabled, onSelect]
  );

  return (
    <div className="classical-card flex-1 space-y-2 overflow-y-auto p-4 text-sm select-text">
      {lines.length === 0 ? <p className="opacity-60">Transcript will appear here.</p> : null}
      {lines.map((line, i) => (
        <div key={`${line.role}-${i}`}>
          <p
            data-role={line.role}
            onMouseUp={() => handleMouseUp(i, line.role)}
            onTouchEnd={() => handleMouseUp(i, line.role)}
          >
            <strong>{line.role}:</strong> {line.text}
          </p>
          {line.role === "User" && corrections[i] ? (
            <CorrectionTip tip={corrections[i]} onAdd={() => onAddFromCorrection(i)} />
          ) : null}
        </div>
      ))}
      {selectedText ? <p className="text-xs opacity-50">Selected: {selectedText}</p> : null}
    </div>
  );
}
