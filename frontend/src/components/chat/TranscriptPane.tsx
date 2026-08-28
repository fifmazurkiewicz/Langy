"use client";

import { useEffect, useRef } from "react";
import type { CorrectionResponse } from "@/lib/api/correction";
import { TranscriptLine } from "@/components/chat/TranscriptLine";

export type TranscriptLineData = { role: "User" | "Agent"; text: string };

type Props = {
  lines: TranscriptLineData[];
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
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines.length, corrections]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto border-y border-[var(--color-divider)] py-3 select-text">
      {lines.length === 0 ? (
        <p className="px-1 text-sm text-[var(--color-soft)]">Transcript will appear here.</p>
      ) : (
        <div className="flex flex-col gap-3 px-1">
          {lines.map((line, i) => (
            <TranscriptLine
              key={`${line.role}-${i}-${line.text.slice(0, 12)}`}
              role={line.role}
              text={line.text}
              lineIndex={i}
              enabled={enabled}
              correction={corrections[i]}
              onSelect={onSelect}
              onAddFromCorrection={onAddFromCorrection}
            />
          ))}
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
