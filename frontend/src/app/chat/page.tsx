"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, checkApiHealth } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { BottomNav } from "@/components/BottomNav";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

type ChatState = "waking" | "idle" | "listening" | "thinking" | "speaking";

type TranscriptLine = { role: "User" | "Agent"; text: string };

export default function ChatPage() {
  const { token, activeLanguage, refreshProfile } = useAuth();
  const [apiReady, setApiReady] = useState(false);
  const [state, setState] = useState<ChatState>("waking");
  const [listening, setListening] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
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
    setState("idle");
    await apiFetch(`/api/chat/sessions/${conversationId}/end`, { method: "POST", token });
    setConversationId(null);
    const count = await apiFetch<{ count: number }>("/api/vocab/pending/count", { token });
    setPendingCount(count.count);
    alert(count.count > 0 ? "Session ended — check Memo → Pending" : "No new words from that chat");
  }, [conversationId, token]);

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

        <div className="classical-card flex-1 space-y-2 overflow-y-auto p-4 text-sm">
          {lines.length === 0 ? <p className="opacity-60">Transcript will appear here.</p> : null}
          {lines.map((line, i) => (
            <p key={`${line.role}-${i}`}>
              <strong>{line.role}:</strong> {line.text}
            </p>
          ))}
        </div>

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

      <BottomNav pendingCount={pendingCount} />
    </div>
  );
}
