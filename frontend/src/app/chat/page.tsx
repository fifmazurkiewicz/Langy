"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, checkApiHealth } from "@/lib/api";
import { addSelectionPending, translateSelection, type TranslateSelectionResponse } from "@/lib/api/selection";
import { useAuth } from "@/components/AuthProvider";
import { BottomNav } from "@/components/BottomNav";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SelectionActionSheet } from "@/components/chat/SelectionActionSheet";
import { TranscriptPane, type TranscriptLine } from "@/components/chat/TranscriptPane";
import { TranslatePanel } from "@/components/chat/TranslatePanel";

type ChatState = "waking" | "idle" | "listening" | "thinking" | "speaking";

export default function ChatPage() {
  const { token, activeLanguage, refreshProfile } = useAuth();
  const [apiReady, setApiReady] = useState(false);
  const [state, setState] = useState<ChatState>("waking");
  const [listening, setListening] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [selectedSpan, setSelectedSpan] = useState<string | null>(null);
  const [translateResult, setTranslateResult] = useState<TranslateSelectionResponse | null>(null);
  const [translateLoading, setTranslateLoading] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

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
    setState("idle");
  }, [token, activeLanguage]);

  const appendLine = useCallback(
    async (role: "User" | "Agent", text: string) => {
      setLines((prev) => [...prev, { role, text }]);
      if (conversationId && token) {
        await apiFetch(`/api/chat/sessions/${conversationId}/lines`, {
          method: "POST",
          token,
          body: { role, text },
        });
      }
    },
    [conversationId, token]
  );

  const endSession = useCallback(async () => {
    if (!conversationId || !token) return;
    setListening(false);
    setSelectedSpan(null);
    setTranslateResult(null);
    setState("idle");
    await apiFetch(`/api/chat/sessions/${conversationId}/end`, { method: "POST", token });
    setConversationId(null);
    const count = await apiFetch<{ count: number }>("/api/vocab/pending/count", { token });
    setPendingCount(count.count);
    alert(count.count > 0 ? "Session ended — check Memo → Pending" : "No new words from that chat");
  }, [conversationId, token]);

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
    } catch (e) {
      setTranslateError(e instanceof Error ? e.message : "Translation failed");
    } finally {
      setTranslateLoading(false);
    }
  }, [token, activeLanguage, selectedSpan, conversationId]);

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

  useEffect(() => {
    if (!listening || !conversationId) return;
    const SpeechRecognitionCtor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = activeLanguage?.startsWith("en") ? "en-GB" : activeLanguage ?? "en-GB";
    recognition.interimResults = false;
    recognition.continuous = true;
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const text = event.results[event.results.length - 1][0].transcript.trim();
      if (!text) return;
      setState("thinking");
      void appendLine("User", text).then(() => {
        const reply = `Good point about "${text}". Tell me more.`;
        setState("speaking");
        void appendLine("Agent", reply).then(() => setState(listening ? "listening" : "idle"));
      });
    };
    recognition.onerror = () => setState("idle");
    recognition.start();
    recognitionRef.current = recognition;
    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [listening, conversationId, activeLanguage, appendLine]);

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
          {state === "waking" ? "Waking up…" : `Agent: ${state}`}
        </div>

        <TranscriptPane
          lines={lines}
          enabled={Boolean(conversationId)}
          onSelect={(text) => setSelectedSpan(text)}
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
          onTranslate={() => void handleTranslate()}
          onAdd={() => void handleAddPending(selectedSpan)}
          onDismiss={() => setSelectedSpan(null)}
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

      <BottomNav pendingCount={pendingCount} />
    </div>
  );
}
