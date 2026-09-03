import { describe, expect, it } from "vitest";

import { clampTtsPlaybackRate } from "./ttsPlaybackRate";

describe("clampTtsPlaybackRate", () => {
  it("returns 1 for invalid input", () => {
    expect(clampTtsPlaybackRate(undefined)).toBe(1);
    expect(clampTtsPlaybackRate("x")).toBe(1);
  });

  it("snaps to nearest allowed rate", () => {
    expect(clampTtsPlaybackRate(0.8)).toBe(0.75);
    expect(clampTtsPlaybackRate(1.1)).toBe(1);
    expect(clampTtsPlaybackRate(1.4)).toBe(1.5);
  });
});
