/** Allowed tutor speech rates (profile + TTS playback). */
export const TTS_PLAYBACK_RATES = [0.75, 1, 1.25, 1.5] as const;

export type TtsPlaybackRate = (typeof TTS_PLAYBACK_RATES)[number];

export function clampTtsPlaybackRate(value: unknown): TtsPlaybackRate {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 1;
  let best: TtsPlaybackRate = 1;
  let bestDist = Infinity;
  for (const rate of TTS_PLAYBACK_RATES) {
    const dist = Math.abs(rate - n);
    if (dist < bestDist) {
      best = rate;
      bestDist = dist;
    }
  }
  return best;
}
