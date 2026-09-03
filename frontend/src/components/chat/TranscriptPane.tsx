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
  onRespeak?: (text: string) => void;
};

export function TranscriptPane({
  lines,
  enabled,
  corrections,
  onSelect,
  onAddFromCorrection,
  onRespeak,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines.length, corrections]);

  return (
    <div className="select-text py-1">
      {lines.length === 0 ? (
        <p className="text-sm text-[var(--color-soft)]">Transcript will appear here.</p>
      ) : (
        <div className="flex flex-col gap-3">
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
              onRespeak={onRespeak}
            />
          ))}
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
