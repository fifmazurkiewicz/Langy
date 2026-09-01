"use client";

import { useCallback, useState } from "react";
import { fetchTts, type VoiceCatalog, type VoiceOption } from "@/lib/api/voice";
import { playServerTtsAudio } from "@/lib/voice/playTts";

const CUSTOM_KEY = "custom";

type Props = {
  token: string;
  language: string;
  catalog: VoiceCatalog;
  selectedKey: string;
  customVoiceId: string;
  onSelect: (key: string) => void;
  onCustomVoiceIdChange: (id: string) => void;
  disabled?: boolean;
};

export function VoicePicker({
  token,
  language,
  catalog,
  selectedKey,
  customVoiceId,
  onSelect,
  onCustomVoiceIdChange,
  disabled,
}: Props) {
  const [previewingKey, setPreviewingKey] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const handlePreview = useCallback(
    async (voice: VoiceOption) => {
      if (disabled || previewingKey) return;
      if (voice.key === CUSTOM_KEY && !customVoiceId.trim()) {
        setPreviewError("Enter your ElevenLabs voice ID first.");
        return;
      }
      setPreviewError(null);
      setPreviewingKey(voice.key);
      try {
        const tts = await fetchTts(token, {
          text: catalog.preview_sample,
          language,
          voice_key: voice.key,
          custom_voice_id: voice.key === CUSTOM_KEY ? customVoiceId.trim() : undefined,
        });
        await playServerTtsAudio(tts);
      } catch {
        setPreviewError("Preview failed — check the voice ID and your ElevenLabs API key.");
      } finally {
        setPreviewingKey(null);
      }
    },
    [token, language, catalog.preview_sample, customVoiceId, disabled, previewingKey]
  );

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-serif text-xl">Tutor voice</h2>
        <p className="mt-1 text-sm opacity-70">
          Per language. Default uses the server voice; pick another or paste your own ElevenLabs ID.
        </p>
        <p className="classical-card mt-2 p-3 text-sm italic opacity-80">&ldquo;{catalog.preview_sample}&rdquo;</p>
      </div>
      <ul className="space-y-2">
        {catalog.voices.map((voice) => {
          const selected = selectedKey === voice.key;
          const previewing = previewingKey === voice.key;
          const isCustom = voice.is_custom;
          return (
            <li key={voice.key}>
              <div
                className={`classical-card p-3 ${selected ? "ring-1 ring-[var(--color-accent)]" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    disabled={disabled}
                    onClick={() => onSelect(voice.key)}
                    aria-pressed={selected}
                  >
                    <span className="font-serif">{voice.label}</span>
                    {voice.is_default ? (
                      <span className="ml-2 text-xs opacity-60">(default)</span>
                    ) : null}
                    <span className="mt-0.5 block text-xs opacity-70">{voice.description}</span>
                  </button>
                  {!isCustom ? (
                    <button
                      type="button"
                      className="classical-btn shrink-0 px-3 text-sm"
                      disabled={disabled || Boolean(previewingKey)}
                      onClick={() => void handlePreview(voice)}
                      aria-label={`Preview ${voice.label}`}
                    >
                      {previewing ? "…" : "Preview"}
                    </button>
                  ) : null}
                </div>
                {isCustom && selected ? (
                  <div className="mt-3 space-y-2 border-t border-[var(--color-divider)] pt-3">
                    <label className="block text-xs opacity-70" htmlFor="custom-voice-id">
                      ElevenLabs voice ID (from Voice Library → copy ID)
                    </label>
                    <input
                      id="custom-voice-id"
                      className="classical-input w-full font-mono text-sm"
                      value={customVoiceId}
                      disabled={disabled}
                      placeholder="e.g. 21m00Tcm4TlvDq8ikWAM"
                      onChange={(e) => {
                        onCustomVoiceIdChange(e.target.value);
                        setPreviewError(null);
                      }}
                    />
                    <button
                      type="button"
                      className="classical-btn w-full text-sm"
                      disabled={disabled || !customVoiceId.trim() || Boolean(previewingKey)}
                      onClick={() => void handlePreview(voice)}
                    >
                      {previewing ? "Playing…" : "Preview custom voice"}
                    </button>
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      {previewError ? <p className="text-xs text-[var(--color-accent)]">{previewError}</p> : null}
    </section>
  );
}
