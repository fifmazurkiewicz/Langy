"use client";

import { useState } from "react";

const QUESTIONS = [
  { q: "I can introduce myself and ask basic questions.", levels: ["A1", "A2", "B1", "B2", "C1"] },
  { q: "I can handle travel situations (hotel, directions, ordering).", levels: ["A1", "A2", "B1", "B2", "C1", "C2"] },
  { q: "I can discuss work topics and write simple emails.", levels: ["A2", "B1", "B2", "C1", "C2"] },
  { q: "I can follow news and express opinions with nuance.", levels: ["B1", "B2", "C1", "C2"] },
  { q: "I can debate abstract topics and understand idiomatic speech.", levels: ["B2", "C1", "C2"] },
] as const;

export function suggestCefr(answers: boolean[]): string {
  const scores: Record<string, number> = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 };
  answers.forEach((yes, i) => {
    if (!yes) return;
    for (const level of QUESTIONS[i].levels) {
      scores[level] = (scores[level] ?? 0) + 1;
    }
  });
  const order = ["C2", "C1", "B2", "B1", "A2", "A1"] as const;
  for (const level of order) {
    if ((scores[level] ?? 0) >= 2) return level;
  }
  return answers.filter(Boolean).length >= 2 ? "B1" : "A2";
}

type Props = {
  onResult: (level: string) => void;
  onSkip: () => void;
};

export function CefrPlacement({ onResult, onSkip }: Props) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);

  function answer(yes: boolean) {
    const next = [...answers, yes];
    setAnswers(next);
    if (step + 1 >= QUESTIONS.length) {
      onResult(suggestCefr(next));
    } else {
      setStep((s) => s + 1);
    }
  }

  const current = QUESTIONS[step];

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--color-soft)]">
        Question {step + 1} of {QUESTIONS.length}
      </p>
      <p className="font-serif text-lg">{current.q}</p>
      <div className="flex gap-2">
        <button type="button" className="classical-btn classical-btn-primary flex-1" onClick={() => answer(true)}>
          Yes
        </button>
        <button type="button" className="classical-btn flex-1" onClick={() => answer(false)}>
          Not yet
        </button>
      </div>
      <button type="button" className="text-sm text-[var(--color-soft)] underline" onClick={onSkip}>
        Skip placement
      </button>
    </div>
  );
}
