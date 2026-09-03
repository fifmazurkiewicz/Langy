"use client";

import { useCallback, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { LiveTokenResponse } from "@/lib/api/live";
import {
  enqueueLivePcmBase64,
  extractLiveAudioBase64Parts,
  stopLivePcmPlayback,
} from "@/lib/voice/livePcmPlayer";

type LiveCallbacks = {
  onUserText?: (text: string) => void;
  onAgentText?: (text: string) => void;
  onError?: (message: string) => void;
  onWordSaved?: (term: string) => void;
  onAgentAudio?: () => void;
};

type LiveConnectContext = {
  conversationId?: string | null;
  apiToken?: string | null;
};

type LiveSession = {
  sendUserText: (text: string) => Promise<void>;
  interrupt: () => Promise<void>;
  disconnect: () => void;
  sendToolResponse: (name: string, id: string, response: Record<string, unknown>) => Promise<void>;
};

type LivePart = {
  inlineData?: { data?: string; mimeType?: string };
  text?: string;
};

type LiveMessage = {
  serverContent?: {
    inputTranscription?: { text?: string };
    outputTranscription?: { text?: string };
    modelTurn?: { parts?: LivePart[] };
    interrupted?: boolean;
    turnComplete?: boolean;
  };
  toolCall?: {
    functionCalls?: { id?: string; name?: string; args?: Record<string, unknown> }[];
  };
};

/** Minimal silent PCM frame (16-bit mono) to nudge Live interruption. */
const SILENT_PCM_B64 = "AAAA"; // 2 zero bytes

export function useGeminiLive(callbacks: LiveCallbacks) {
  const [connected, setConnected] = useState(false);
  const sessionRef = useRef<LiveSession | null>(null);
  const contextRef = useRef<LiveConnectContext>({});
  const rawSessionRef = useRef<{
    sendClientContent: (params: unknown) => Promise<void>;
    sendRealtimeInput?: (params: unknown) => Promise<void> | void;
    sendToolResponse: (params: unknown) => Promise<void>;
    close: () => void;
  } | null>(null);
  const ignoreOutputRef = useRef(false);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const disconnect = useCallback(() => {
    stopLivePcmPlayback();
    ignoreOutputRef.current = true;
    sessionRef.current?.disconnect();
    sessionRef.current = null;
    rawSessionRef.current = null;
    setConnected(false);
  }, []);

  const connect = useCallback(
    async (liveConfig: LiveTokenResponse, context: LiveConnectContext = {}) => {
      disconnect();
      ignoreOutputRef.current = false;
      contextRef.current = context;
      if (liveConfig.mode !== "live" || !liveConfig.token) {
        return false;
      }

      try {
        const { GoogleGenAI, Modality, Type } = await import("@google/genai");
        const ai = new GoogleGenAI({
          apiKey: liveConfig.token,
          httpOptions: { apiVersion: "v1alpha" },
        });

        const session = await ai.live.connect({
          model: liveConfig.model.replace("models/", ""),
          config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction: liveConfig.system_instruction,
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            tools: [
              {
                functionDeclarations: [
                  {
                    name: "save_word",
                    description:
                      "Save a word or phrase to the user's flashcards when they ask to remember it.",
                    parameters: {
                      type: Type.OBJECT,
                      properties: {
                        term: { type: Type.STRING, description: "Word or phrase in target language" },
                        translation: { type: Type.STRING, description: "Polish translation" },
                        context: { type: Type.STRING, description: "Optional example sentence" },
                      },
                      required: ["term", "translation"],
                    },
                  },
                ],
              },
            ],
          },
          callbacks: {
            onmessage: (message) => {
              const msg = message as LiveMessage;
              const sc = msg.serverContent;
              if (sc?.interrupted) {
                stopLivePcmPlayback();
                return;
              }

              const audioParts = extractLiveAudioBase64Parts(msg);
              if (audioParts.length && !ignoreOutputRef.current) {
                callbacksRef.current.onAgentAudio?.();
                for (const b64 of audioParts) {
                  void enqueueLivePcmBase64(b64);
                }
              }

              if (ignoreOutputRef.current) return;

              if (sc?.inputTranscription?.text) {
                callbacksRef.current.onUserText?.(sc.inputTranscription.text);
              }
              if (sc?.outputTranscription?.text) {
                callbacksRef.current.onAgentText?.(sc.outputTranscription.text);
              } else if (sc?.modelTurn?.parts) {
                const text = sc.modelTurn.parts.map((p) => p.text ?? "").join("").trim();
                if (text) callbacksRef.current.onAgentText?.(text);
              }

              const calls = msg.toolCall?.functionCalls ?? [];
              for (const call of calls) {
                if (call.name !== "save_word" || !call.id) continue;
                const args = call.args ?? {};
                const term = String(args.term ?? "");
                const translation = String(args.translation ?? "");
                const convId = contextRef.current.conversationId;
                const apiToken = contextRef.current.apiToken;
                const callId = call.id;
                void (async () => {
                  let saved = false;
                  if (convId && apiToken && term) {
                    try {
                      await apiFetch(`/api/chat/sessions/${convId}/save-word`, {
                        method: "POST",
                        token: apiToken,
                        body: {
                          term,
                          translation,
                          context: args.context ? String(args.context) : null,
                        },
                      });
                      saved = true;
                      callbacksRef.current.onWordSaved?.(term);
                    } catch {
                      saved = false;
                    }
                  }
                  await sessionRef.current?.sendToolResponse("save_word", callId, {
                    saved,
                    message: saved ? `Saved "${term}" to flashcards.` : "Could not save word.",
                  });
                })();
              }
            },
            onerror: (e: ErrorEvent) => {
              callbacksRef.current.onError?.(e.message ?? "Live session error");
            },
            onclose: () => setConnected(false),
          },
        });

        rawSessionRef.current = session as typeof rawSessionRef.current;

        sessionRef.current = {
          sendUserText: async (text: string) => {
            ignoreOutputRef.current = false;
            await session.sendClientContent({
              turns: [{ role: "user", parts: [{ text }] }],
              turnComplete: true,
            });
          },
          interrupt: async () => {
            ignoreOutputRef.current = true;
            stopLivePcmPlayback();
            const raw = rawSessionRef.current;
            try {
              if (raw?.sendRealtimeInput) {
                await raw.sendRealtimeInput({
                  audio: {
                    data: SILENT_PCM_B64,
                    mimeType: "audio/pcm;rate=16000",
                  },
                });
              }
            } catch {
              /* best-effort interrupt */
            }
          },
          sendToolResponse: async (name: string, id: string, response: Record<string, unknown>) => {
            await session.sendToolResponse({
              functionResponses: [{ id, name, response }],
            });
          },
          disconnect: () => {
            stopLivePcmPlayback();
            session.close();
          },
        };
        setConnected(true);
        return true;
      } catch (e) {
        callbacksRef.current.onError?.(e instanceof Error ? e.message : "Could not connect to Gemini Live");
        return false;
      }
    },
    [disconnect]
  );

  const sendUserText = useCallback(async (text: string) => {
    await sessionRef.current?.sendUserText(text);
  }, []);

  const interrupt = useCallback(async () => {
    await sessionRef.current?.interrupt();
  }, []);

  return { connected, connect, disconnect, sendUserText, interrupt };
}
