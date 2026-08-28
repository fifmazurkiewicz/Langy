"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import {
  appendChatLine,
  chainedTurn,
  endChatSession,
  getChatSession,
  listChatConversations,
  resumeChatSession,
  startChatSession,
  type ConversationListItem,
} from "@/lib/api/chat";
import { useApiPulse } from "@/components/ApiPulseProvider";
import {
  addCorrectionPending,
  runCorrection,
  type CorrectionResponse,
} from "@/lib/api/correction";
import { addSelectionPending, translateSelection, type TranslateSelectionResponse } from "@/lib/api/selection";
import { fetchLiveConfig, fetchLiveToken } from "@/lib/api/live";
import { useLearningLanguage } from "@/lib/hooks/useLearningLanguage";
import { useGeminiLive } from "@/lib/voice/useGeminiLive";
import { useAuth } from "@/components/AuthProvider";
import { BottomNav } from "@/components/BottomNav";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import type { ChatVisualState } from "@/components/chat/AgentPresence";
import { ChatControlBar } from "@/components/chat/ChatControlBar";
import { ChatStage } from "@/components/chat/ChatStage";
import { ConversationDetailSheet } from "@/components/chat/ConversationDetailSheet";
import { EndSessionSheet } from "@/components/chat/EndSessionSheet";
import { HistorySheet } from "@/components/chat/HistorySheet";
import { MicStatusBanner, type MicStatus } from "@/components/chat/MicStatusBanner";
import { SelectionActionSheet } from "@/components/chat/SelectionActionSheet";
import { SessionSummarySheet } from "@/components/chat/SessionSummarySheet";
import { TranscriptPane, type TranscriptLineData } from "@/components/chat/TranscriptPane";
import { TranslatePanel } from "@/components/chat/TranslatePanel";
import { formatConversationDate } from "@/lib/chat/transcript";

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
  const { token, refreshProfile } = useAuth();
  const { sessionLanguage, languages, status: languageStatus } = useLearningLanguage();
  const { isHealthy: apiReady, isWaking } = useApiPulse();
  const [startingSession, setStartingSession] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [chatState, setChatState] = useState<ChatVisualState>("idle");
  const [listening, setListening] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [lines, setLines] = useState<TranscriptLineData[]>([]);
  const [corrections, setCorrections] = useState<Record<number, CorrectionResponse>>({});
  const [pendingCount, setPendingCount] = useState(0);
  const [selectedSpan, setSelectedSpan] = useState<string | null>(null);
  const [selectedLineIndex, setSelectedLineIndex] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<"User" | "Agent" | null>(null);
  const [translateResult, setTranslateResult] = useState<TranslateSelectionResponse | null>(null);
  const [translateLoading, setTranslateLoading] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [checkResult, setCheckResult] = useState<CorrectionResponse | null>(null);
  const [micStatus, setMicStatus] = useState<MicStatus>("off");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyItems, setHistoryItems] = useState<ConversationListItem[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailLines, setDetailLines] = useState<TranscriptLineData[]>([]);
  const [detailItem, setDetailItem] = useState<ConversationListItem | null>(null);
  const [endSheetOpen, setEndSheetOpen] = useState(false);
  const [endSheetMode, setEndSheetMode] = useState<"end" | "switch">("end");
  const [pendingResumeId, setPendingResumeId] = useState<string | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryPendingCount, setSummaryPendingCount] = useState(0);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const appendLineRef = useRef<(role: "User" | "Agent", text: string) => Promise<number>>(async () => 0);
  const listeningRef = useRef(listening);
  const voiceModeRef = useRef("speech_to_speech");
  const lineIndexRef = useRef(0);

  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);

  const canStartSession =
    apiReady && languageStatus === "ready" && Boolean(sessionLanguage) && Boolean(token) && !startingSession;
  const visualState: ChatVisualState = isWaking ? "waking" : chatState;

  const geminiLive = useGeminiLive({
    onAgentText: (text) => {
      setChatState("speaking");
      void appendLineRef.current("Agent", text).then(() =>
        setChatState(listeningRef.current ? "listening" : "idle")
      );
    },
    onError: (message) => console.warn("Gemini Live:", message),
  });

  const connectLive = useCallback(
    async (convId: string) => {
      if (!token || !sessionLanguage) return;
      try {
        const config = await fetchLiveConfig(token);
        voiceModeRef.current = config.voice_mode;
        const live = await fetchLiveToken(token, {
          language: sessionLanguage,
          conversation_id: convId,
        });
        if (live.mode === "live" && live.configured) {
          await geminiLive.connect(live, { conversationId: convId, apiToken: token });
        }
      } catch {
        /* fall back to mock / chained */
      }
    },
    [token, sessionLanguage, geminiLive]
  );

  const triggerAutoCorrection = useCallback(
    async (lineIndex: number, text: string) => {
      if (!token || !sessionLanguage) return;
      try {
        const result = await runCorrection(token, {
          text,
          language: sessionLanguage,
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
    [token, sessionLanguage, conversationId]
  );

  useEffect(() => {
    if (!token) return;
    apiFetch<{ count: number }>("/api/vocab/pending/count", { token })
      .then((d) => setPendingCount(d.count))
      .catch(() => undefined);
    fetchLiveConfig(token)
      .then((c) => {
        voiceModeRef.current = c.voice_mode;
      })
      .catch(() => undefined);
  }, [token]);

  const appendLine = useCallback(
    async (role: "User" | "Agent", text: string) => {
      let lineIndex = 0;
      setLines((prev) => {
        lineIndex = prev.length;
        return [...prev, { role, text }];
      });
      if (conversationId && token) {
        await appendChatLine(token, conversationId, { role, text });
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

  const loadSession = useCallback(
    async (convId: string, sessionLines: TranscriptLineData[]) => {
      setConversationId(convId);
      setLines(sessionLines);
      setCorrections({});
      setChatState("idle");
      setListening(false);
      setDetailOpen(false);
      setHistoryOpen(false);
      await connectLive(convId);
    },
    [connectLive]
  );

  const startSession = useCallback(async () => {
    if (!token || !sessionLanguage) return;
    setStartingSession(true);
    setStartError(null);
    try {
      const session = await startChatSession(token, { language: sessionLanguage });
      await loadSession(session.conversation_id, [{ role: "Agent", text: session.opening_line }]);
    } catch (e) {
      setStartError(e instanceof Error ? e.message : "Could not start session");
    } finally {
      setStartingSession(false);
    }
  }, [token, sessionLanguage, loadSession]);

  const performEndSession = useCallback(async () => {
    if (!conversationId || !token) return;
    const endedId = conversationId;
    setListening(false);
    setMicStatus("off");
    geminiLive.disconnect();
    setSelectedSpan(null);
    setTranslateResult(null);
    setCheckResult(null);
    setCorrections({});
    setChatState("idle");
    setConversationId(null);
    setLines([]);
    await endChatSession(token, endedId);
    const count = await apiFetch<{ count: number }>("/api/vocab/pending/count", { token });
    setPendingCount(count.count);
    setSummaryPendingCount(count.count);
    setSummaryOpen(true);
  }, [conversationId, token, geminiLive]);

  const requestEndSession = useCallback(() => {
    setEndSheetMode("end");
    setEndSheetOpen(true);
  }, []);

  const confirmEndSession = useCallback(async () => {
    setEndSheetOpen(false);
    await performEndSession();
    if (pendingResumeId && token) {
      const resumeId = pendingResumeId;
      setPendingResumeId(null);
      try {
        const resumed = await resumeChatSession(token, resumeId);
        await loadSession(resumed.conversation_id, resumed.lines);
      } catch (e) {
        setStartError(e instanceof Error ? e.message : "Could not resume session");
      }
    }
  }, [performEndSession, pendingResumeId, token, loadSession]);

  const openHistory = useCallback(async () => {
    if (!token) return;
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const data = await listChatConversations(token, sessionLanguage ?? undefined);
      setHistoryItems(data.conversations);
    } catch {
      setHistoryItems([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [token, sessionLanguage]);

  const openConversationDetail = useCallback(
    async (item: ConversationListItem) => {
      if (!token) return;
      setDetailItem(item);
      setDetailOpen(true);
      setDetailLoading(true);
      try {
        const session = await getChatSession(token, item.id);
        setDetailLines(session.lines);
      } catch {
        setDetailLines([]);
      } finally {
        setDetailLoading(false);
      }
    },
    [token]
  );

  const continueConversation = useCallback(async () => {
    if (!token || !detailItem) return;
    if (detailItem.is_active) {
      await loadSession(detailItem.id, detailLines);
      return;
    }
    if (conversationId) {
      setPendingResumeId(detailItem.id);
      setEndSheetMode("switch");
      setEndSheetOpen(true);
      return;
    }
    try {
      const resumed = await resumeChatSession(token, detailItem.id);
      await loadSession(resumed.conversation_id, resumed.lines);
    } catch (e) {
      setStartError(e instanceof Error ? e.message : "Could not resume session");
    }
  }, [token, detailItem, detailLines, conversationId, loadSession]);

  const handleTranslate = useCallback(async () => {
    if (!token || !sessionLanguage || !selectedSpan) return;
    setTranslateLoading(true);
    setTranslateError(null);
    try {
      const result = await translateSelection(token, {
        span: selectedSpan,
        language: sessionLanguage,
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
  }, [token, sessionLanguage, selectedSpan, conversationId]);

  const handleCheck = useCallback(async () => {
    if (!token || !sessionLanguage || !selectedSpan) return;
    setTranslateLoading(true);
    setTranslateError(null);
    try {
      const result = await runCorrection(token, {
        text: selectedSpan,
        language: sessionLanguage,
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
  }, [token, sessionLanguage, selectedSpan, conversationId, selectedLineIndex]);

  const handleAddPending = useCallback(
    async (span: string, translationPl?: string) => {
      if (!token || !sessionLanguage) return;
      try {
        const res = await addSelectionPending(token, {
          span,
          language: sessionLanguage,
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
    [token, sessionLanguage, conversationId]
  );

  const handleAddFromCorrection = useCallback(
    async (lineIndex: number) => {
      const tip = corrections[lineIndex];
      const original = lines[lineIndex]?.text;
      if (!token || !sessionLanguage || !tip?.corrected_text || !original) return;
      try {
        const res = await addCorrectionPending(token, {
          original_text: original,
          corrected_text: tip.corrected_text,
          language: sessionLanguage,
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
    [token, sessionLanguage, corrections, lines, conversationId]
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
        setChatState("idle");
        return;
      }
      if (!SpeechRecognitionCtor) {
        setMicStatus("unsupported");
        setListening(false);
        setChatState("idle");
        return;
      }

      setMicStatus("ready");
      const recognition = new SpeechRecognitionCtor();
      recognition.lang = sessionLanguage?.startsWith("en") ? "en-GB" : (sessionLanguage ?? "en-GB");
      recognition.interimResults = false;
      recognition.continuous = true;
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const text = event.results[event.results.length - 1][0].transcript.trim();
        if (!text) return;
        setChatState("thinking");
        void appendLine("User", text).then((lineIndex) => {
          lineIndexRef.current = lineIndex;
          if (geminiLive.connected) {
            void geminiLive.sendUserText(text);
            setChatState(listeningRef.current ? "listening" : "idle");
            return;
          }
          if (voiceModeRef.current === "chained" && token && sessionLanguage) {
            void chainedTurn(token, { text, language: sessionLanguage, conversation_id: conversationId ?? undefined })
              .then((res) => {
                if (res.correction?.is_corrected) {
                  setCorrections((prev) => ({ ...prev, [lineIndex]: res.correction as CorrectionResponse }));
                }
                setChatState("speaking");
                void appendLine("Agent", res.agent_reply).then(() =>
                  setChatState(listeningRef.current ? "listening" : "idle")
                );
              })
              .catch(() => {
                const reply = `Good point about "${text}". Tell me more.`;
                setChatState("speaking");
                void appendLine("Agent", reply).then(() =>
                  setChatState(listeningRef.current ? "listening" : "idle")
                );
              });
            return;
          }
          const reply = `Good point about "${text}". Tell me more.`;
          setChatState("speaking");
          void appendLine("Agent", reply).then(() => setChatState(listeningRef.current ? "listening" : "idle"));
        });
      };
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === "not-allowed") {
          setMicStatus("blocked");
          setListening(false);
        }
        setChatState("idle");
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
  }, [listening, conversationId, sessionLanguage, token, appendLine, geminiLive]);

  const detailTitle = detailItem
    ? formatConversationDate(detailItem.started_at) || "Conversation"
    : "Conversation";

  return (
    <div className="flex flex-1 flex-col pb-[calc(120px+env(safe-area-inset-bottom))]">
      <header className="flex items-center gap-2 border-b border-[var(--color-divider)] px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <LanguageSwitcher
          activeLanguage={sessionLanguage}
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
        <button
          type="button"
          className="classical-btn min-h-[44px] shrink-0 px-3 text-sm"
          onClick={() => void openHistory()}
          aria-label="Conversation history"
        >
          History
        </button>
      </header>

      <main className="flex min-h-0 flex-1 flex-col gap-3 px-4 pt-3">
        <MicStatusBanner
          status={activeMicStatus}
          hasSession={Boolean(conversationId)}
          onDismissBlocked={() => setMicStatus("off")}
        />

        <ChatStage
          visualState={visualState}
          hasSession={Boolean(conversationId)}
          preSessionAction={
            <>
              {!apiReady ? <p className="text-center text-sm text-[var(--color-soft)]">Waiting for API…</p> : null}
              {apiReady && languageStatus === "loading" ? (
                <p className="text-center text-sm text-[var(--color-soft)]">Loading profile…</p>
              ) : null}
              {apiReady && languageStatus === "needs_setup" ? (
                <div className="space-y-2 text-center text-sm">
                  <p className="text-[var(--color-soft)]">Add a learning language to start chatting.</p>
                  <Link href="/onboarding" className="classical-btn classical-btn-primary inline-block px-4 py-2">
                    Set up languages
                  </Link>
                </div>
              ) : null}
              {startError ? <p className="text-center text-sm text-red-400">{startError}</p> : null}
            </>
          }
          transcript={
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
          }
        />
      </main>

      <ChatControlBar
        hasSession={Boolean(conversationId)}
        listening={listening}
        startingSession={startingSession}
        canStartSession={canStartSession}
        onStart={() => void startSession()}
        onToggleListening={() => {
          setListening((v) => {
            const next = !v;
            if (next && conversationId) setChatState("listening");
            if (!next) setChatState("idle");
            return next;
          });
        }}
        onEnd={requestEndSession}
      />

      <HistorySheet
        open={historyOpen}
        loading={historyLoading}
        conversations={historyItems}
        onClose={() => setHistoryOpen(false)}
        onSelect={(item) => void openConversationDetail(item)}
      />

      <ConversationDetailSheet
        open={detailOpen}
        title={detailTitle}
        lines={detailLines}
        isActive={detailItem?.is_active ?? false}
        loading={detailLoading}
        onClose={() => setDetailOpen(false)}
        onContinue={() => void continueConversation()}
        onReturnToSession={() => void continueConversation()}
      />

      <EndSessionSheet
        open={endSheetOpen}
        mode={endSheetMode}
        onConfirm={() => void confirmEndSession()}
        onCancel={() => {
          setEndSheetOpen(false);
          setPendingResumeId(null);
        }}
      />

      <SessionSummarySheet
        open={summaryOpen}
        pendingCount={summaryPendingCount}
        onClose={() => setSummaryOpen(false)}
      />

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
          result={
            translateResult ?? {
              span: "",
              translation_pl: "",
              example_l2: "",
              example_pl: "",
              from_cache: false,
            }
          }
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
        <div className="fixed inset-x-0 bottom-36 z-30 mx-auto max-w-lg p-4">
          <div className="classical-card p-4 text-sm">
            <p className="font-serif">{checkResult.corrected_text}</p>
            {checkResult.explanation_pl ? <p className="mt-1 opacity-80">{checkResult.explanation_pl}</p> : null}
            <button type="button" className="classical-btn mt-2" onClick={() => setCheckResult(null)}>
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      <BottomNav pendingCount={pendingCount} />
    </div>
  );
}
