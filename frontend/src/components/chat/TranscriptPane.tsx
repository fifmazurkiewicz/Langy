"use client";

import { useCallback, useState } from "react";

export type TranscriptLine = { role: "User" | "Agent"; text: string };

type Props = {
  lines: TranscriptLine[];
  enabled: boolean;
  onSelect: (text: string) => void;
};

export function TranscriptPane({ lines, enabled, onSelect }: Props) {
  const [selectedText, setSelectedText] = useState("");

  const handleMouseUp = useCallback(() => {
    if (!enabled) return;
    const sel = window.getSelection()?.toString().trim();
    if (sel) {
      setSelectedText(sel);
      onSelect(sel);
    }
  }, [enabled, onSelect]);

  return (
    <div
      className="classical-card flex-1 space-y-2 overflow-y-auto p-4 text-sm select-text"
      onMouseUp={handleMouseUp}
      onTouchEnd={handleMouseUp}
    >
      {lines.length === 0 ? <p className="opacity-60">Transcript will appear here.</p> : null}
      {lines.map((line, i) => (
        <p key={`${line.role}-${i}`} data-role={line.role}>
          <strong>{line.role}:</strong> {line.text}
        </p>
      ))}
      {selectedText ? <p className="text-xs opacity-50">Selected: {selectedText}</p> : null}
    </div>
  );
}
