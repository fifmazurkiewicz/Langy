"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, checkApiHealth } from "@/lib/api";
import {
  addCorrectionPending,
  runCorrection,
  type CorrectionResponse,
} from "@/lib/api/correction";
import { addSelectionPending, translateSelection, type TranslateSelectionResponse } from "@/lib/api/selection";
import { fetchLiveToken } from "@/lib/api/live";
import { useGeminiLive } from "@/lib/voice/useGeminiLive";
import { useAuth } from "@/components/AuthProvider";
import { BottomNav } from "@/components/BottomNav";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { MicStatusBanner, type MicStatus } from "@/components/chat/MicStatusBanner";
import { SelectionActionSheet } from "@/components/chat/SelectionActionSheet";
import { TranscriptPane, type TranscriptLine } from "@/components/chat/TranscriptPane";
import { TranslatePanel } from "@/components/chat/TranslatePanel";

type ChatState = "waking" | "idle" | "listening" | "thinking" | "speaking";

const STATE_LABELS: Record<ChatState, string> = {
  waking: "Waking up…",
  idle: "Ready when you are",
  listening: "Listening",
  thinking: "Thinking",
  speaking: "Speaking",
};

function speechRecognitionSupported() {
  if (typeof window === "undefined") return false;
  return Boolean(window.SpeechRecognition ?? window.webkitSpeechRecognition);
}

async function probeMicrophone(): Promise<MicStatus> {
  if (!speechRecognitionSupported()) return "unsupported";
  if (!navigator.mediaDevices?.getUserMedia) return "unsupported";
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return "ready";
  } catch (err) {
    if (err instanceof DOMException && err.name === "NotAllowedError") return "blocked";
    return "unsupported";
  }
}

export default function ChatPage() {
  const { token, activeLanguage, refreshProfile } = useAuth();
  const [apiReady, setApiReady] = useState(false);
  const [state, setState] = useState<ChatState>("waking");
  const [listening, setListening] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const [corrections, setCorrections] = useState<Record<number, CorrectionResponse>>({});
  const [languages, setLanguages] = useState<string[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [selectedSpan, setSelectedSpan] = useState<string | null>(null);
  const [selectedLineIndex, setSelectedLineIndex] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<"User" | "Agent" | null>(null);
  const [translateResult, setTranslateResult] = useState<TranslateSelectionResponse | null>(null);
  const [translateLoading, setTranslateLoading] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [checkResult, setCheckResult] = useState<CorrectionResponse | null>(null);
  const [liveMode, setLiveMode] = useState<"live" | "mock">("mock");
  const [micStatus, setMicStatus] = useState<MicStatus>("off");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const appendLineRef = useRef<(role: "User" | "Agent", text: string) => Promise<number>>(async () => 0);
  const listeningRef = useRef(listening);

  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);

  const geminiLive = useGeminiLive({
    onAgentText: (text) => {
      setState("speaking");
      void appendLineRef.current("Agent", text).then(() =>
        setState(listeningRef.current ? "listening" : "idle")
      );
    },
    onError: (message) => console.warn("Gemini Live:", message),
  });

  const triggerAutoCorrection = useCallback(
    async (lineIndex: number, text: string) => {
      if (!token || !activeLanguage) return;
      try {
        const result = await runCorrection(token, {
          text,
          language: activeLanguage,
          mode: "auto",
          conversation_id: conversationId ?? undefined,
        });
        if (result.is_corrected) {
          setCorrections((prev) => ({ ...prev, [lineIndex]: result }));
        }
      } catch {
        /* silent skip for auto per spec */
      }
    },
    [token, activeLanguage, conversationId]
  );

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      const ok = await checkApiHealth();
      if (!cancelled) {
        setApiReady(ok);
        setState(ok ? "idle" : "waking");
      }
    }
    void poll();
    const id = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    apiFetch<{ profiles: { language: string }[] }>("/api/profile/languages", { token })
      .then((data) => setLanguages(data.profiles.map((p) => p.language)))
      .catch(() => setLanguages(["en-GB"]));
    apiFetch<{ count: number }>("/api/vocab/pending/count", { token })
      .then((d) => setPendingCount(d.count))
      .catch(() => undefined);
  }, [token]);

  const startSession = useCallback(async () => {
    if (!token || !activeLanguage) return;
    const session = await apiFetch<{
      conversation_id: string;
      opening_line: string;
    }>("/api/chat/sessions", {
      method: "POST",
      token,
      body: { language: activeLanguage },
    });
    setConversationId(session.conversation_id);
    setLines([{ role: "Agent", text: session.opening_line }]);
    setCorrections({});
    setState("idle");

    try {
      const live = await fetchLiveToken(token, {
        language: activeLanguage,
        conversation_id: session.conversation_id,
      });
      setLiveMode(live.mode === "live" && live.configured ? "live" : "mock");
      if (live.mode === "live" && live.configured) {
        await geminiLive.connect(live);
      }
    } catch {
      setLiveMode("mock");
    }
  }, [token, activeLanguage, geminiLive]);

  const appendLine = useCallback(
    async (role: "User" | "Agent", text: string) => {
      let lineIndex = 0;
      setLines((prev) => {
        lineIndex = prev.length;
        return [...prev, { role, text }];
      });
      if (conversationId && token) {
        await apiFetch(`/api/chat/sessions/${conversationId}/lines`, {
          method: "POST",
          token,
          body: { role, text },
        });
      }
      if (role === "User") {
        void triggerAutoCorrection(lineIndex, text);
      }
      return lineIndex;
    },
    [conversationId, token, triggerAutoCorrection]
  );

  useEffect(() => {
    appendLineRef.current = appendLine;
  }, [appendLine]);

  const endSession = useCallback(async () => {
    if (!conversationId || !token) return;
    setListening(false);
    setMicStatus("off");
    geminiLive.disconnect();
    setLiveMode("mock");
    setSelectedSpan(null);
    setTranslateResult(null);
    setCheckResult(null);
    setCorrections({});
    setState("idle");
    await apiFetch(`/api/chat/sessions/${conversationId}/end`, { method: "POST", token });
    setConversationId(null);
    const count = await apiFetch<{ count: number }>("/api/vocab/pending/count", { token });
    setPendingCount(count.count);
    alert(count.count > 0 ? "Session ended — check Memo → Pending" : "No new words from that chat");
  }, [conversationId, token, geminiLive]);

  const handleTranslate = useCallback(async () => {
    if (!token || !activeLanguage || !selectedSpan) return;
    setTranslateLoading(true);
    setTranslateError(null);
    try {
      const result = await translateSelection(token, {
        span: selectedSpan,
        language: activeLanguage,
        conversation_id: conversationId ?? undefined,
      });
      setTranslateResult(result);
      setSelectedSpan(null);
      setSelectedLineIndex(null);
      setSelectedRole(null);
    } catch (e) {
      setTranslateError(e instanceof Error ? e.message : "Translation failed");
    } finally {
      setTranslateLoading(false);
    }
  }, [token, activeLanguage, selectedSpan, conversationId]);

  const handleCheck = useCallback(async () => {
    if (!token || !activeLanguage || !selectedSpan) return;
    setTranslateLoading(true);
    setTranslateError(null);
    try {
      const result = await runCorrection(token, {
        text: selectedSpan,
        language: activeLanguage,
        mode: "check",
        conversation_id: conversationId ?? undefined,
      });
      setCheckResult(result);
      if (selectedLineIndex !== null && result.is_corrected) {
        setCorrections((prev) => ({ ...prev, [selectedLineIndex]: result }));
      }
      setSelectedSpan(null);
      setSelectedLineIndex(null);
      setSelectedRole(null);
    } catch (e) {
      setTranslateError(e instanceof Error ? e.message : "Check failed");
    } finally {
      setTranslateLoading(false);
    }
  }, [token, activeLanguage, selectedSpan, conversationId, selectedLineIndex]);

  const handleAddPending = useCallback(
    async (span: string, translationPl?: string) => {
      if (!token || !activeLanguage) return;
      try {
        const res = await addSelectionPending(token, {
          span,
          language: activeLanguage,
          translation_pl: translationPl,
          conversation_id: conversationId ?? undefined,
        });
        if (res.status === "already_exists") {
          alert("Already in your list");
        } else {
          const count = await apiFetch<{ count: number }>("/api/vocab/pending/count", { token });
          setPendingCount(count.count);
        }
        setSelectedSpan(null);
        setTranslateResult(null);
      } catch (e) {
        alert(e instanceof Error ? e.message : "Could not add word");
      }
    },
    [token, activeLanguage, conversationId]
  );

  const handleAddFromCorrection = useCallback(
    async (lineIndex: number) => {
      const tip = corrections[lineIndex];
      const original = lines[lineIndex]?.text;
      if (!token || !activeLanguage || !tip?.corrected_text || !original) return;
      try {
        const res = await addCorrectionPending(token, {
          original_text: original,
          corrected_text: tip.corrected_text,
          language: activeLanguage,
          explanation_pl: tip.explanation_pl ?? undefined,
          conversation_id: conversationId ?? undefined,
        });
        if (res.status === "already_exists") {
          alert("Already in your list");
        } else {
          const count = await apiFetch<{ count: number }>("/api/vocab/pending/count", { token });
          setPendingCount(count.count);
        }
      } catch (e) {
        alert(e instanceof Error ? e.message : "Could not add word");
      }
    },
    [token, activeLanguage, corrections, lines, conversationId]
  );

  const browserSpeechUnsupported = Boolean(conversationId) && !speechRecognitionSupported();
  const activeMicStatus: MicStatus = browserSpeechUnsupported ? "unsupported" : micStatus;

  useEffect(() => {
    if (!listening || !conversationId) return;

    let cancelled = false;
    const SpeechRecognitionCtor = window.SpeechRecognition ?? window.webkitSpeechRecognition;

    async function startListening() {
      const status = await probeMicrophone();
      if (cancelled) return;
      if (status !== "ready") {
        setMicStatus(status);
        setListening(false);
        setState("idle");
        return;
      }
      if (!SpeechRecognitionCtor) {
        setMicStatus("unsupported");
        setListening(false);
        setState("idle");
        return;
      }

      setMicStatus("ready");
      const recognition = new SpeechRecognitionCtor();
      recognition.lang = activeLanguage?.startsWith("en") ? "en-GB" : activeLanguage ?? "en-GB";
      recognition.interimResults = false;
      recognition.continuous = true;
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const text = event.results[event.results.length - 1][0].transcript.trim();
        if (!text) return;
        setState("thinking");
        void appendLine("User", text).then(() => {
          if (geminiLive.connected) {
            void geminiLive.sendUserText(text);
            setState(listeningRef.current ? "listening" : "idle");
            return;
          }
          const reply = `Good point about "${text}". Tell me more.`;
          setState("speaking");
          void appendLine("Agent", reply).then(() => setState(listeningRef.current ? "listening" : "idle"));
        });
      };
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === "not-allowed") {
          setMicStatus("blocked");
          setListening(false);
        }
        setState("idle");
      };
      recognition.onend = () => {
        if (!cancelled && listeningRef.current && recognitionRef.current === recognition) {
          try {
            recognition.start();
          } catch {
            /* ignore restart race */
          }
        }
      };
      recognition.start();
      recognitionRef.current = recognition;
    }

    void startListening();
    return () => {
      cancelled = true;
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, [listening, conversationId, activeLanguage, appendLine, geminiLive]);

  return (
    <div className="flex flex-1 flex-col pb-[calc(52px+env(safe-area-inset-bottom))]">
      <header className="flex items-center justify-between border-b border-[var(--color-divider)] p-4">
        <h1 className="text-xl">Chat</h1>
        <LanguageSwitcher
          activeLanguage={activeLanguage}
          languages={languages.length ? languages : ["en-GB"]}
          onChange={async (lang) => {
            if (!token) return;
            await apiFetch("/api/profile/active-language", {
              method: "PATCH",
              token,
              body: { active_language: lang },
            });
            await refreshProfile();
          }}
        />
      </header>

      <main className="flex flex-1 flex-col gap-4 p-4">
        <div className="classical-card flex min-h-[48px] items-center justify-center p-3 text-sm">
          {state === "waking"
            ? STATE_LABELS.waking
            : `${STATE_LABELS[state]}${conversationId ? ` · ${liveMode === "live" ? "Gemini Live" : "Web Speech"}` : ""}`}
        </div>

        <MicStatusBanner
          status={activeMicStatus}
          listening={listening}
          hasSession={Boolean(conversationId)}
          onDismissBlocked={() => setMicStatus("off")}
        />

        <TranscriptPane
          lines={lines}
          enabled={Boolean(conversationId)}
          corrections={corrections}
          onSelect={(text, lineIndex, role) => {
            setSelectedSpan(text);
            setSelectedLineIndex(lineIndex);
            setSelectedRole(role);
          }}
          onAddFromCorrection={(lineIndex) => void handleAddFromCorrection(lineIndex)}
        />

        <div className="flex flex-wrap gap-2">
          {!conversationId ? (
            <button
              type="button"
              className="classical-btn classical-btn-primary"
              disabled={!apiReady || !activeLanguage}
              onClick={() => void startSession()}
            >
              Start session
            </button>
          ) : (
            <>
              <button
                type="button"
                className={`classical-btn ${listening ? "classical-btn-primary" : ""}`}
                onClick={() => {
                  setListening((v) => {
                    const next = !v;
                    if (next && conversationId) setState("listening");
                    if (!next) setState("idle");
                    return next;
                  });
                }}
              >
                Listening {listening ? "on" : "off"}
              </button>
              <button type="button" className="classical-btn" onClick={() => void endSession()}>
                End session
              </button>
            </>
          )}
        </div>
      </main>

      {selectedSpan ? (
        <SelectionActionSheet
          span={selectedSpan}
          showCheck={selectedRole === "User"}
          onTranslate={() => void handleTranslate()}
          onCheck={() => void handleCheck()}
          onAdd={() => void handleAddPending(selectedSpan)}
          onDismiss={() => {
            setSelectedSpan(null);
            setSelectedLineIndex(null);
            setSelectedRole(null);
          }}
        />
      ) : null}

      {translateResult || translateLoading || translateError ? (
        <TranslatePanel
          result={translateResult ?? { span: "", translation_pl: "", example_l2: "", example_pl: "", from_cache: false }}
          loading={translateLoading}
          error={translateError}
          onAdd={() => void handleAddPending(translateResult!.span, translateResult!.translation_pl)}
          onClose={() => {
            setTranslateResult(null);
            setTranslateError(null);
          }}
          onRetry={() => void handleTranslate()}
        />
      ) : null}

      {checkResult?.is_corrected && !translateResult ? (
        <div className="fixed inset-x-0 bottom-24 z-30 mx-auto max-w-lg p-4">
          <div className="classical-card p-4 text-sm">
            <p className="font-serif">{checkResult.corrected_text}</p>
            {checkResult.explanation_pl ? <p className="mt-1 opacity-80">{checkResult.explanation_pl}</p> : null}
            <button
              type="button"
              className="classical-btn mt-2"
              onClick={() => setCheckResult(null)}
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      <BottomNav pendingCount={pendingCount} />
    </div>
  );
}
