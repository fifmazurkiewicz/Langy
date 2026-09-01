"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  addShadowingPending,
  endShadowingSession,
  listShadowingConversations,
  startShadowingSession,
  submitShadowingTurn,
  type DialogueLine,
} from "@/lib/api/shadowing";
import { fetchLiveToken } from "@/lib/api/live";
import { useGeminiLive } from "@/lib/voice/useGeminiLive";
import { runOneShotRecognition, speechRecognitionSupported } from "@/lib/voice/webSpeechTurn";

type Props = {
  token: string;
  language: string;
  onDone: (pendingCreated: number) => void;
};

type Step = "intake" | "past" | "setup" | "loop" | "done";
type SourceMode = "generated" | "past";

function speakLine(text: string, language: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language.startsWith("en") ? "en-GB" : language;
  window.speechSynthesis.speak(utterance);
}

export function ShadowingFlow({ token, language, onDone }: Props) {
  const [step, setStep] = useState<Step>("intake");
  const [sourceMode, setSourceMode] = useState<SourceMode>("generated");
  const [topic, setTopic] = useState("");
  const [pastConversations, setPastConversations] = useState<{ id: string; preview: string }[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showText, setShowText] = useState(true);
  const [audioMode, setAudioMode] = useState<"tts" | "live">("tts");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lines, setLines] = useState<DialogueLine[]>([]);
  const [lineIndex, setLineIndex] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hardIds, setHardIds] = useState<string[]>([]);
  const [speakOnceActive, setSpeakOnceActive] = useState(false);
  const playedRef = useRef<string | null>(null);
  const oneShotRef = useRef<SpeechRecognition | null>(null);

  const speechLang = language.startsWith("en") ? "en-GB" : language;

  const geminiLive = useGeminiLive({
    onAgentText: (text) => speakLine(text, language),
    onError: () => undefined,
  });

  const agentLines = lines.filter((l) => l.role === "agent");
  const current = agentLines[lineIndex];

  const playCurrentLine = useCallback(
    async (line: DialogueLine) => {
      if (audioMode === "tts") {
        speakLine(line.text, language);
        return;
      }
      if (!sessionId) {
        speakLine(line.text, language);
        return;
      }
      try {
        const live = await fetchLiveToken(token, { language });
        if (live.mode === "live" && live.configured) {
          await geminiLive.connect(live);
          await geminiLive.sendUserText(`Say exactly: ${line.text}`);
        } else {
          speakLine(line.text, language);
        }
      } catch {
        speakLine(line.text, language);
      }
    },
    [audioMode, geminiLive, language, sessionId, token]
  );

  useEffect(() => {
    if (step !== "loop" || !current) return;
    if (playedRef.current === current.id) return;
    playedRef.current = current.id;
    void playCurrentLine(current);
  }, [step, current, playCurrentLine]);

  useEffect(() => {
    return () => {
      oneShotRef.current?.stop();
      oneShotRef.current = null;
    };
  }, []);

  useEffect(() => {
    oneShotRef.current?.stop();
    oneShotRef.current = null;
    setSpeakOnceActive(false);
  }, [lineIndex, step]);

  const handleSpeakOnce = useCallback(() => {
    if (speakOnceActive || loading) return;

    oneShotRef.current?.stop();
    oneShotRef.current = null;
    setSpeakOnceActive(true);

    const recognition = runOneShotRecognition(
      speechLang,
      (text) => {
        setUserInput(text);
        setSpeakOnceActive(false);
        oneShotRef.current = null;
      },
      () => {
        setSpeakOnceActive(false);
        oneShotRef.current = null;
      }
    );

    if (!recognition) {
      setSpeakOnceActive(false);
      alert("Speech not supported in this browser. Use Chrome or Edge, or type your repeat.");
      return;
    }

    recognition.onend = () => {
      setSpeakOnceActive(false);
      oneShotRef.current = null;
    };
    oneShotRef.current = recognition;
  }, [speakOnceActive, loading, speechLang]);

  async function loadPastConversations() {
    setLoading(true);
    try {
      const data = await listShadowingConversations(token, language);
      setPastConversations(data.conversations);
      setStep("past");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not load conversations");
    } finally {
      setLoading(false);
    }
  }

  async function handleStart() {
    if (sourceMode === "generated" && !topic.trim()) return;
    if (sourceMode === "past" && !selectedConversationId) return;
    setLoading(true);
    try {
      const session = await startShadowingSession(token, {
        language,
        topic: sourceMode === "generated" ? topic.trim() : undefined,
        conversation_id: sourceMode === "past" ? selectedConversationId ?? undefined : undefined,
        show_text: showText,
        audio_mode: audioMode,
      });
      setSessionId(session.session_id);
      setLines(session.dialogue);
      setLineIndex(0);
      setHardIds([]);
      playedRef.current = null;
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
      if (res.mark_hard && !hardIds.includes(current.id)) {
        setHardIds((prev) => [...prev, current.id]);
      }
      if (!showText) setRevealed(true);
      if (lineIndex + 1 >= agentLines.length) {
        const end = await endShadowingSession(token, sessionId);
        geminiLive.disconnect();
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

  async function handleAddCurrent() {
    if (!sessionId || !current) return;
    setLoading(true);
    try {
      const res = await addShadowingPending(token, sessionId, [current.id]);
      alert(res.created ? "Added to Pending" : "Already in your list");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not add line");
    } finally {
      setLoading(false);
    }
  }

  if (step === "intake") {
    return (
      <div className="space-y-4">
        <p className="opacity-80">Choose your shadowing source</p>
        <div className="flex gap-2">
          <button
            type="button"
            className={`classical-btn flex-1 ${sourceMode === "generated" ? "classical-btn-primary" : ""}`}
            onClick={() => setSourceMode("generated")}
          >
            New topic
          </button>
          <button
            type="button"
            className={`classical-btn flex-1 ${sourceMode === "past" ? "classical-btn-primary" : ""}`}
            onClick={() => {
              setSourceMode("past");
              void loadPastConversations();
            }}
          >
            Past chat
          </button>
        </div>
        {sourceMode === "generated" ? (
          <>
            <input
              className="classical-input"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. ordering coffee"
            />
            <button type="button" className="classical-btn classical-btn-primary w-full" onClick={() => setStep("setup")}>
              Continue
            </button>
          </>
        ) : (
          <p className="text-sm opacity-70">{loading ? "Loading conversations…" : "Pick a past conversation next."}</p>
        )}
      </div>
    );
  }

  if (step === "past") {
    return (
      <div className="space-y-4">
        <p className="opacity-80">Pick a conversation</p>
        {pastConversations.length === 0 ? (
          <p className="text-sm opacity-60">No ended conversations yet — try a generated dialogue.</p>
        ) : (
          <ul className="space-y-2">
            {pastConversations.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className={`classical-card w-full p-3 text-left text-sm ${
                    selectedConversationId === c.id ? "ring-1 ring-[var(--color-accent)]" : ""
                  }`}
                  onClick={() => setSelectedConversationId(c.id)}
                >
                  {c.preview || "Conversation"}
                </button>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          className="classical-btn classical-btn-primary w-full"
          disabled={!selectedConversationId}
          onClick={() => setStep("setup")}
        >
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
        {hardIds.length > 0 ? ` · ${hardIds.length} marked hard` : ""}
      </p>
      {revealed && current ? (
        <p className="classical-card p-4 font-serif text-lg">{current.text}</p>
      ) : (
        <p className="classical-card p-4 opacity-60">Listen and repeat…</p>
      )}
      <button
        type="button"
        className="classical-btn w-full text-sm"
        disabled={!current}
        onClick={() => current && void playCurrentLine(current)}
      >
        Replay line
      </button>
      <div className="flex items-end gap-2">
        <input
          className="classical-input min-w-0 flex-1"
          value={userInput}
          disabled={loading || speakOnceActive}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Type your repeat"
          aria-label="Type your repeat"
        />
        {speechRecognitionSupported() ? (
          <button
            type="button"
            className={`classical-btn shrink-0 px-3 ${speakOnceActive ? "classical-btn-primary" : ""}`}
            disabled={loading || speakOnceActive}
            onClick={handleSpeakOnce}
            aria-pressed={speakOnceActive}
            aria-label="Speak your repeat"
          >
            {speakOnceActive ? "Listening…" : "Speak"}
          </button>
        ) : null}
      </div>
      {feedback ? <p className="text-sm opacity-80">{feedback}</p> : null}
      <div className="flex gap-2">
        <button type="button" className="classical-btn flex-1" disabled={loading || !current} onClick={() => void handleAddCurrent()}>
          Add
        </button>
        <button
          type="button"
          className="classical-btn classical-btn-primary flex-1"
          disabled={loading || !userInput.trim()}
          onClick={() => void handleRepeat()}
        >
          {loading ? "Checking…" : "Submit repeat"}
        </button>
      </div>
    </div>
  );
}
