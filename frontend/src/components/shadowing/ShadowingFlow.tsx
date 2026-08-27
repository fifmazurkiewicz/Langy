"use client";

import { useState } from "react";
import {
  endShadowingSession,
  startShadowingSession,
  submitShadowingTurn,
  type DialogueLine,
} from "@/lib/api/shadowing";

type Props = {
  token: string;
  language: string;
  onDone: (pendingCreated: number) => void;
};

type Step = "intake" | "setup" | "loop" | "done";

export function ShadowingFlow({ token, language, onDone }: Props) {
  const [step, setStep] = useState<Step>("intake");
  const [topic, setTopic] = useState("");
  const [showText, setShowText] = useState(true);
  const [audioMode, setAudioMode] = useState<"tts" | "live">("tts");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lines, setLines] = useState<DialogueLine[]>([]);
  const [lineIndex, setLineIndex] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(false);

  const agentLines = lines.filter((l) => l.role === "agent");
  const current = agentLines[lineIndex];

  async function handleStart() {
    if (!topic.trim()) return;
    setLoading(true);
    try {
      const session = await startShadowingSession(token, {
        language,
        topic: topic.trim(),
        show_text: showText,
        audio_mode: audioMode,
      });
      setSessionId(session.session_id);
      setLines(session.dialogue);
      setStep("loop");
      setRevealed(showText);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not start session");
    } finally {
      setLoading(false);
    }
  }

  async function handleRepeat() {
    if (!sessionId || !current) return;
    setLoading(true);
    try {
      const res = await submitShadowingTurn(token, sessionId, {
        line_id: current.id,
        user_transcript: userInput,
      });
      if (res.explanation_pl) setFeedback(res.explanation_pl);
      if (!showText) setRevealed(true);
      if (lineIndex + 1 >= agentLines.length) {
        const end = await endShadowingSession(token, sessionId);
        setStep("done");
        onDone(end.created);
      } else {
        setLineIndex((i) => i + 1);
        setUserInput("");
        setFeedback(null);
        setRevealed(showText);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Turn failed");
    } finally {
      setLoading(false);
    }
  }

  if (step === "intake") {
    return (
      <div className="space-y-4">
        <p className="opacity-80">What topic would you like to practice?</p>
        <input
          className="classical-input"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. ordering coffee"
        />
        <button type="button" className="classical-btn classical-btn-primary" onClick={() => setStep("setup")}>
          Continue
        </button>
      </div>
    );
  }

  if (step === "setup") {
    return (
      <div className="space-y-4">
        <label className="flex min-h-[44px] items-center gap-2">
          <input type="checkbox" checked={showText} onChange={(e) => setShowText(e.target.checked)} />
          Show text (default on)
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            className={`classical-btn ${audioMode === "tts" ? "classical-btn-primary" : ""}`}
            onClick={() => setAudioMode("tts")}
          >
            TTS
          </button>
          <button
            type="button"
            className={`classical-btn ${audioMode === "live" ? "classical-btn-primary" : ""}`}
            onClick={() => setAudioMode("live")}
          >
            Live
          </button>
        </div>
        <button
          type="button"
          className="classical-btn classical-btn-primary w-full"
          disabled={loading}
          onClick={() => void handleStart()}
        >
          {loading ? "Starting…" : "Start shadowing"}
        </button>
      </div>
    );
  }

  if (step === "done") {
    return <p className="opacity-80">Session complete. Check Memo → Pending for new lines.</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-xs opacity-60">
        Line {lineIndex + 1} / {agentLines.length}
      </p>
      {revealed && current ? (
        <p className="classical-card p-4 font-serif text-lg">{current.text}</p>
      ) : (
        <p className="classical-card p-4 opacity-60">Listen and repeat…</p>
      )}
      <input
        className="classical-input"
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        placeholder="Type or speak your repeat"
      />
      {feedback ? <p className="text-sm opacity-80">{feedback}</p> : null}
      <button
        type="button"
        className="classical-btn classical-btn-primary w-full"
        disabled={loading || !userInput.trim()}
        onClick={() => void handleRepeat()}
      >
        {loading ? "Checking…" : "Submit repeat"}
      </button>
    </div>
  );
}
