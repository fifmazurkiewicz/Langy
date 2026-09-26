"use client";

import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import type { CorrectionResponse } from "@/lib/api/correction";
import { TranscriptLine } from "@/components/chat/TranscriptLine";

export type TranscriptLineData = { role: "User" | "Agent"; text: string };

type Props = {
  lines: TranscriptLineData[];
  sessionId: string;
  enabled: boolean;
  corrections: Record<number, CorrectionResponse>;
  onSelect: (text: string, lineIndex: number, role: "User" | "Agent") => void;
  onAddFromCorrection: (lineIndex: number) => void;
  onRespeak?: (text: string) => void;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
};

export function TranscriptPane({
  lines,
  sessionId,
  enabled,
  corrections,
  onSelect,
  onAddFromCorrection,
  onRespeak,
  scrollContainerRef,
}: Props) {
  const followLatestRef = useRef(true);

  useLayoutEffect(() => {
    followLatestRef.current = true;
  }, [sessionId]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const updateFollowLatest = () => {
      followLatestRef.current = container.scrollHeight - container.scrollTop - container.clientHeight < 48;
    };
    container.addEventListener("scroll", updateFollowLatest, { passive: true });
    return () => container.removeEventListener("scroll", updateFollowLatest);
  }, [scrollContainerRef]);

  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !followLatestRef.current) return;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [lines.length, corrections, scrollContainerRef]);

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
    </div>
  );
}
