"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import {
  appendChatLine,
  chainedTurn,
  textTurn,
  deleteChatConversation,
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
import { fetchVoiceConfig, type VoiceConfig } from "@/lib/api/voice";
import { useLearningLanguage } from "@/lib/hooks/useLearningLanguage";
import { useGeminiLive } from "@/lib/voice/useGeminiLive";
import { cancelSpeech, speakTutorLine } from "@/lib/voice/speakLine";
import {
  bindDebouncedContinuousRecognition,
  getSpeechRecognitionCtor,
  runOneShotRecognition,
  speechRecognitionSupported,
} from "@/lib/voice/webSpeechTurn";
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
import { LiveGeminiLamp } from "@/components/chat/LiveGeminiLamp";
import { VoiceDots } from "@/components/chat/VoiceDots";
import { formatConversationDate } from "@/lib/chat/transcript";
import {
  readLiveGeminiPreference,
  writeLiveGeminiPreference,
} from "@/lib/voice/liveGeminiPreference";
import { createLiveMicGate } from "@/lib/voice/liveMicGate";
import { isLivePcmIdle, whenLivePcmIdle } from "@/lib/voice/livePcmPlayer";
import { withMicSuspended } from "@/lib/voice/withMicSuspended";

const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  tts_provider: "elevenlabs",
  tts_configured: false,
  stt_end_silence_ms: 2500,
  tts_playback_rate: 1,
};

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
  const [deletingConversationId, setDeletingConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [speakOnceActive, setSpeakOnceActive] = useState(false);
  const [tutorVoice, setTutorVoice] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("langy-chat-tutor-voice") === "true";
  });
  const [liveGemini, setLiveGemini] = useState(() => readLiveGeminiPreference());
  const [micSuspended, setMicSuspended] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const oneShotRef = useRef<SpeechRecognition | null>(null);
  const unbindSpeechRef = useRef<(() => void) | null>(null);
  const appendLineRef = useRef<(role: "User" | "Agent", text: string) => Promise<number>>(async () => 0);
  const listeningRef = useRef(listening);
  const tutorVoiceRef = useRef(tutorVoice);
  const liveGeminiRef = useRef(liveGemini);
  const voiceModeRef = useRef("speech_to_speech");
  const voiceConfigRef = useRef<VoiceConfig>(DEFAULT_VOICE_CONFIG);
  const lineIndexRef = useRef(0);
  const micSuspendedRef = useRef(false);
  const liveMicGateRef = useRef<ReturnType<typeof createLiveMicGate> | null>(null);
  const recognitionActive = listening && !micSuspended;

  useEffect(() => {
    liveMicGateRef.current = createLiveMicGate({
      listeningOn: () => listeningRef.current,
      setSuspended: (value) => {
        micSuspendedRef.current = value;
        setMicSuspended(value);
      },
      whenIdle: whenLivePcmIdle,
      isIdle: isLivePcmIdle,
    });
  }, []);

  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);

  useEffect(() => {
    micSuspendedRef.current = micSuspended;
  }, [micSuspended]);

  useEffect(() => {
    tutorVoiceRef.current = tutorVoice;
    sessionStorage.setItem("langy-chat-tutor-voice", String(tutorVoice));
  }, [tutorVoice]);

  useEffect(() => {
    liveGeminiRef.current = liveGemini;
    writeLiveGeminiPreference(liveGemini);
  }, [liveGemini]);

  const canStartSession =
    apiReady && languageStatus === "ready" && Boolean(sessionLanguage) && Boolean(token) && !startingSession;
  const visualState: ChatVisualState = isWaking ? "waking" : chatState;

  const geminiLive = useGeminiLive({
    onAgentText: (text) => {
      setChatState("speaking");
      void appendLineRef.current("Agent", text);
    },
    onAgentAudio: () => {
      setChatState("speaking");
      liveMicGateRef.current?.onAgentAudio();
    },
    onAgentTurnComplete: () => {
      void liveMicGateRef.current?.onTurnComplete().then(() => {
        setChatState(listeningRef.current ? "listening" : "idle");
      });
    },
    onError: (message) => console.warn("Gemini Live:", message),
  });
  const {
    connected: liveConnected,
    connect: connectGeminiLive,
    disconnect: disconnectGeminiLive,
    sendUserText,
    interrupt: interruptLive,
  } = geminiLive;

  const connectLive = useCallback(
    async (convId: string) => {
      if (!token || !sessionLanguage || !tutorVoiceRef.current || !liveGeminiRef.current) return;
      try {
        const config = await fetchLiveConfig(token);
        voiceModeRef.current = config.voice_mode;
        const live = await fetchLiveToken(token, {
          language: sessionLanguage,
          conversation_id: convId,
        });
        if (live.mode === "live" && live.configured) {
          await connectGeminiLive(live, { conversationId: convId, apiToken: token });
        }
      } catch {
        /* fall back to mock / chained */
      }
    },
    [token, sessionLanguage, connectGeminiLive]
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
    fetchVoiceConfig(token, sessionLanguage ?? undefined)
      .then((cfg) => {
        voiceConfigRef.current = cfg;
      })
      .catch(() => undefined);
  }, [token, sessionLanguage]);

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

  const speechLang = sessionLanguage?.startsWith("en") ? "en-GB" : (sessionLanguage ?? "en-GB");

  const speakWithMicGate = useCallback(
    async (text: string) => {
      if (!token) return;
      await withMicSuspended(listeningRef.current, setMicSuspended, () =>
        speakTutorLine(text, speechLang, token, voiceConfigRef.current)
      );
    },
    [token, speechLang]
  );

  const deliverAgentReply = useCallback(
    async (lineIndex: number, reply: string) => {
      setChatState("speaking");
      await appendLine("Agent", reply);
      if (tutorVoiceRef.current && !liveConnected && token) {
        try {
          await speakWithMicGate(reply);
        } catch {
          /* text-only when server TTS unavailable */
        }
      }
      setChatState(listeningRef.current ? "listening" : "idle");
      if (lineIndex >= 0) lineIndexRef.current = lineIndex;
    },
    [appendLine, liveConnected, token, speakWithMicGate]
  );

  const submitUserMessage = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();
      if (!text || !conversationId || sending) return;

      setSending(true);
      setChatState("thinking");
      try {
        const lineIndex = await appendLine("User", text);
        lineIndexRef.current = lineIndex;

        if (liveConnected) {
          await sendUserText(text);
          // Stay thinking/speaking until Live turnComplete + audio idle.
          return;
        }

        if (voiceModeRef.current === "chained" && token && sessionLanguage) {
          try {
            const res = await chainedTurn(token, {
              text,
              language: sessionLanguage,
              conversation_id: conversationId,
            });
            if (res.correction?.is_corrected) {
              setCorrections((prev) => ({ ...prev, [lineIndex]: res.correction as CorrectionResponse }));
            }
            await deliverAgentReply(lineIndex, res.agent_reply);
          } catch {
            await deliverAgentReply(
              lineIndex,
              "I'm having trouble responding right now. Could you try again?"
            );
          }
          return;
        }

        if (token && sessionLanguage) {
          try {
            const res = await textTurn(token, {
              text,
              language: sessionLanguage,
              conversation_id: conversationId,
            });
            await deliverAgentReply(lineIndex, res.agent_reply);
          } catch {
            await deliverAgentReply(
              lineIndex,
              "I'm having trouble responding right now. Could you try again?"
            );
          }
          return;
        }
      } finally {
        setSending(false);
      }
    },
    [conversationId, sending, appendLine, liveConnected, sendUserText, token, sessionLanguage, deliverAgentReply]
  );

  const handleSendText = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    void submitUserMessage(text);
  }, [draft, submitUserMessage]);

  const handleStop = useCallback(() => {
    cancelSpeech();
    void interruptLive();
    liveMicGateRef.current?.onInterrupt();
    setSending(false);
    setChatState(listeningRef.current ? "listening" : "idle");
  }, [interruptLive]);

  const handleSpeakOnce = useCallback(async () => {
    if (!conversationId || speakOnceActive || sending || listening) return;

    const status = await probeMicrophone();
    if (status !== "ready") {
      setMicStatus(status);
      return;
    }

    oneShotRef.current?.stop();
    oneShotRef.current = null;
    setSpeakOnceActive(true);
    setChatState("listening");

    const recognition = runOneShotRecognition(
      speechLang,
      (text) => {
        setSpeakOnceActive(false);
        setChatState("idle");
        oneShotRef.current = null;
        void submitUserMessage(text);
      },
      (code) => {
        setSpeakOnceActive(false);
        setChatState("idle");
        oneShotRef.current = null;
        if (code === "not-allowed") setMicStatus("blocked");
      }
    );

    if (!recognition) {
      setSpeakOnceActive(false);
      setChatState("idle");
      setMicStatus("unsupported");
      return;
    }

    recognition.onend = () => {
      setSpeakOnceActive(false);
      if (!sending) setChatState("idle");
      oneShotRef.current = null;
    };
    oneShotRef.current = recognition;
  }, [conversationId, speakOnceActive, sending, listening, speechLang, submitUserMessage]);

  const loadSession = useCallback(
    async (convId: string, sessionLines: TranscriptLineData[]) => {
      setConversationId(convId);
      setLines(sessionLines);
      setCorrections({});
      setChatState("idle");
      setListening(false);
      setDraft("");
      setSpeakOnceActive(false);
      setDetailOpen(false);
      setHistoryOpen(false);
      if (tutorVoiceRef.current) {
        await connectLive(convId);
      } else {
        disconnectGeminiLive();
      }
    },
    [connectLive, disconnectGeminiLive]
  );

  const startSession = useCallback(async () => {
    if (!token || !sessionLanguage) return;
    setStartingSession(true);
    setStartError(null);
    try {
      const session = await startChatSession(token, { language: sessionLanguage });
      await loadSession(session.conversation_id, [{ role: "Agent", text: session.opening_line }]);
      if (tutorVoiceRef.current && !liveConnected && token) {
        setChatState("speaking");
        try {
          await speakWithMicGate(session.opening_line);
        } catch {
          /* text-only when server TTS unavailable */
        }
        setChatState("idle");
      }
    } catch (e) {
      setStartError(e instanceof Error ? e.message : "Could not start session");
    } finally {
      setStartingSession(false);
    }
  }, [token, sessionLanguage, loadSession, liveConnected, speakWithMicGate]);

  const performEndSession = useCallback(async () => {
    if (!conversationId || !token) return;
    const endedId = conversationId;
    setListening(false);
    setMicStatus("off");
    setDraft("");
    setSpeakOnceActive(false);
    oneShotRef.current?.stop();
    oneShotRef.current = null;
    cancelSpeech();
    disconnectGeminiLive();
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
  }, [conversationId, token, disconnectGeminiLive]);

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

  const handleDeleteConversation = useCallback(
    async (item: ConversationListItem) => {
      if (!token || deletingConversationId) return;
      if (item.is_active) {
        alert("End the session before deleting it.");
        return;
      }
      if (!confirm("Delete this conversation? This cannot be undone.")) return;

      setDeletingConversationId(item.id);
      try {
        await deleteChatConversation(token, item.id);
        setHistoryItems((prev) => prev.filter((c) => c.id !== item.id));
        if (detailItem?.id === item.id) {
          setDetailOpen(false);
          setDetailItem(null);
          setDetailLines([]);
        }
        if (conversationId === item.id) {
          setConversationId(null);
          setLines([]);
          setChatState("idle");
        }
      } catch (e) {
        alert(e instanceof Error ? e.message : "Could not delete conversation");
      } finally {
        setDeletingConversationId(null);
      }
    },
    [token, deletingConversationId, detailItem, conversationId]
  );

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
    if (!recognitionActive || !conversationId) return;

    let cancelled = false;
    const SpeechRecognitionCtor = getSpeechRecognitionCtor();

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
      recognition.lang = speechLang;
      unbindSpeechRef.current?.();
      unbindSpeechRef.current = bindDebouncedContinuousRecognition(recognition, (text) => {
        void submitUserMessage(text).finally(() => {
          if (!cancelled && listeningRef.current && recognitionRef.current === recognition) {
            try {
              recognition.stop();
            } catch {
              /* restart via onend */
            }
          }
        });
      });
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === "not-allowed") {
          setMicStatus("blocked");
          setListening(false);
        }
        setChatState("idle");
      };
      recognition.onend = () => {
        if (
          !cancelled &&
          listeningRef.current &&
          !micSuspendedRef.current &&
          recognitionRef.current === recognition
        ) {
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
      unbindSpeechRef.current?.();
      unbindSpeechRef.current = null;
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, [recognitionActive, micSuspended, conversationId, speechLang, submitUserMessage]);

  useEffect(() => {
    if (!conversationId || !token) return;
    if (tutorVoice && liveGemini) {
      void connectLive(conversationId);
      return;
    }
    disconnectGeminiLive();
    cancelSpeech();
  }, [tutorVoice, liveGemini, conversationId, token, connectLive, disconnectGeminiLive]);

  const detailTitle = detailItem
    ? formatConversationDate(detailItem.started_at) || "Conversation"
    : "Conversation";

  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden pb-[calc(168px+env(safe-area-inset-bottom))]">
      <header className="flex shrink-0 items-center gap-2 border-b border-[var(--color-divider)] px-4 pb-2 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <div className="min-w-0 flex-1">
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
        </div>
        <button
          type="button"
          className="classical-btn min-h-[44px] shrink-0 px-3 text-sm"
          onClick={() => void openHistory()}
          aria-label="Conversation history"
        >
          History
        </button>
      </header>

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden px-4">
        <MicStatusBanner
          status={activeMicStatus}
          hasSession={Boolean(conversationId)}
          onDismissBlocked={() => setMicStatus("off")}
        />

        <ChatStage
          visualState={visualState}
          hasSession={Boolean(conversationId)}
          presenceInteractive={
            Boolean(conversationId) && !listening && speechRecognitionSupported() && !speakOnceActive
          }
          presencePressed={speakOnceActive}
          onPresencePress={() => void handleSpeakOnce()}
          leftControls={
            <LiveGeminiLamp
              on={liveGemini}
              onToggle={() => {
                setLiveGemini((prev) => {
                  const next = !prev;
                  if (!next) {
                    disconnectGeminiLive();
                    cancelSpeech();
                  }
                  return next;
                });
              }}
            />
          }
          rightControls={
            conversationId ? (
              <VoiceDots
                tutorVoice={tutorVoice}
                listening={listening}
                disabled={sending && !(chatState === "speaking" || chatState === "thinking")}
                onToggleTutorVoice={() => setTutorVoice((v) => !v)}
                onToggleListening={() => {
                  if (speakOnceActive) {
                    oneShotRef.current?.stop();
                    oneShotRef.current = null;
                    setSpeakOnceActive(false);
                  }
                  setListening((v) => {
                    const next = !v;
                    if (next && conversationId) setChatState("listening");
                    if (!next) setChatState("idle");
                    return next;
                  });
                }}
              />
            ) : null
          }
          preSessionAction={
            <>
              {!apiReady ? <p className="text-center text-sm text-[var(--color-soft)]">Waiting for API…</p> : null}
              {apiReady && languageStatus === "loading" ? (
                <p className="text-center text-sm text-[var(--color-soft)]">Loading profile…</p>
              ) : null}
              {apiReady && languageStatus === "needs_setup" ? (
                <div className="space-y-2 text-center text-sm">
                  <p className="text-[var(--color-soft)]">Add a learning language to start chatting.</p>
                  <Link href="/menu/languages" className="classical-btn classical-btn-primary inline-block px-4 py-2">
                    Set up languages
                  </Link>
                </div>
              ) : null}
              {apiReady && languageStatus === "error" ? (
                <p className="text-center text-sm text-red-400">
                  Could not load your languages. Check your connection and reload.
                </p>
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
              onRespeak={(text) => {
                void speakWithMicGate(text).catch(() => undefined);
              }}
            />
          }
        />
      </main>

      <ChatControlBar
        hasSession={Boolean(conversationId)}
        startingSession={startingSession}
        canStartSession={canStartSession}
        draft={draft}
        sending={sending}
        canStop={chatState === "speaking" || chatState === "thinking" || sending}
        onDraftChange={setDraft}
        onSendText={handleSendText}
        onStop={handleStop}
        onStart={() => void startSession()}
        onEnd={requestEndSession}
      />

      <HistorySheet
        open={historyOpen}
        loading={historyLoading}
        conversations={historyItems}
        deletingId={deletingConversationId}
        onClose={() => setHistoryOpen(false)}
        onSelect={(item) => void openConversationDetail(item)}
        onDelete={(item) => void handleDeleteConversation(item)}
      />

      <ConversationDetailSheet
        open={detailOpen}
        title={detailTitle}
        lines={detailLines}
        isActive={detailItem?.is_active ?? false}
        loading={detailLoading}
        deleting={deletingConversationId === detailItem?.id}
        onClose={() => setDetailOpen(false)}
        onContinue={() => void continueConversation()}
        onReturnToSession={() => void continueConversation()}
        onDelete={() => detailItem && void handleDeleteConversation(detailItem)}
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
