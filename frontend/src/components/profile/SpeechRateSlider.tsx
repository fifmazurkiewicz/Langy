"use client";

import { TTS_PLAYBACK_RATES, type TtsPlaybackRate } from "@/lib/voice/ttsPlaybackRate";

type Props = {
  value: number;
  onChange: (rate: TtsPlaybackRate) => void;
  disabled?: boolean;
};

export function SpeechRateSlider({ value, onChange, disabled }: Props) {
  const index = Math.max(
    0,
    TTS_PLAYBACK_RATES.findIndex((r) => r === value)
  );
  const safeIndex = index >= 0 ? index : 1;

  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-serif text-xl">Speaking speed</h2>
        <span className="text-sm tabular-nums text-[var(--color-accent)]">{value.toFixed(2).replace(/\.?0+$/, "")}×</span>
      </div>
      <p className="text-sm opacity-70">Applies to tutor TTS and respeak. Live voice stays at natural tempo.</p>
      <input
        type="range"
        min={0}
        max={TTS_PLAYBACK_RATES.length - 1}
        step={1}
        value={safeIndex}
        disabled={disabled}
        aria-label="Tutor speaking speed"
        className="w-full accent-[var(--color-accent)]"
        onChange={(e) => onChange(TTS_PLAYBACK_RATES[Number(e.target.value)] ?? 1)}
      />
      <div className="flex justify-between text-xs opacity-60">
        {TTS_PLAYBACK_RATES.map((r) => (
          <span key={r}>{r}×</span>
        ))}
      </div>
    </section>
  );
}
