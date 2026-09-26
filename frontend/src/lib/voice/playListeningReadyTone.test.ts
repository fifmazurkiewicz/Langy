import { describe, expect, it, vi } from "vitest";

import { playListeningReadyTone } from "./playListeningReadyTone";

describe("playListeningReadyTone", () => {
  it("plays a brief tone when Web Audio is available", () => {
    const close = vi.fn();
    const oscillator = {
      frequency: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null as (() => void) | null,
    };
    const gain = { gain: { setValueAtTime: vi.fn() }, connect: vi.fn() };
    class FakeAudioContext {
      currentTime = 1;
      destination = {};
      createGain = () => gain;
      createOscillator = () => oscillator;
      close = close;
    }
    vi.stubGlobal("window", { AudioContext: FakeAudioContext });

    playListeningReadyTone();

    expect(oscillator.frequency.setValueAtTime).toHaveBeenCalledWith(880, 1);
    expect(oscillator.stop).toHaveBeenCalledWith(1.07);
    oscillator.onended?.();
    expect(close).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });
});
