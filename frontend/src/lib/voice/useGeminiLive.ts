"use client";

import { useCallback, useRef, useState } from "react";
import type { LiveTokenResponse } from "@/lib/api/live";

type LiveCallbacks = {
  onUserText?: (text: string) => void;
  onAgentText?: (text: string) => void;
  onError?: (message: string) => void;
};

type LiveSession = {
  sendUserText: (text: string) => Promise<void>;
  disconnect: () => void;
};

export function useGeminiLive(callbacks: LiveCallbacks) {
  const [connected, setConnected] = useState(false);
  const sessionRef = useRef<LiveSession | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    sessionRef.current?.disconnect();
    sessionRef.current = null;
    setConnected(false);
  }, []);

  const connect = useCallback(
    async (liveConfig: LiveTokenResponse) => {
      disconnect();
      if (liveConfig.mode !== "live" || !liveConfig.token) {
        return false;
      }

      try {
        const { GoogleGenAI, Modality } = await import("@google/genai");
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
          },
          callbacks: {
            onmessage: (message: { serverContent?: { inputTranscription?: { text?: string }; outputTranscription?: { text?: string }; modelTurn?: { parts?: { text?: string }[] } } }) => {
              const sc = message.serverContent;
              if (sc?.inputTranscription?.text) {
                callbacks.onUserText?.(sc.inputTranscription.text);
              }
              if (sc?.outputTranscription?.text) {
                callbacks.onAgentText?.(sc.outputTranscription.text);
              } else if (sc?.modelTurn?.parts) {
                const text = sc.modelTurn.parts.map((p) => p.text ?? "").join("").trim();
                if (text) callbacks.onAgentText?.(text);
              }
            },
            onerror: (e: ErrorEvent) => {
              callbacks.onError?.(e.message ?? "Live session error");
            },
            onclose: () => setConnected(false),
          },
        });

        sessionRef.current = {
          sendUserText: async (text: string) => {
            await session.sendClientContent({
              turns: [{ role: "user", parts: [{ text }] }],
              turnComplete: true,
            });
          },
          disconnect: () => {
            session.close();
          },
        };
        setConnected(true);
        return true;
      } catch (e) {
        callbacks.onError?.(e instanceof Error ? e.message : "Could not connect to Gemini Live");
        return false;
      }
    },
    [callbacks, disconnect]
  );

  const sendUserText = useCallback(async (text: string) => {
    await sessionRef.current?.sendUserText(text);
  }, []);

  return { connected, connect, disconnect, sendUserText };
}
