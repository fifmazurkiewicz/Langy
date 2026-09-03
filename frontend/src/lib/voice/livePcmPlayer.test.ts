import { describe, expect, it } from "vitest";
import { base64PcmToFloat32, extractLiveAudioBase64Parts } from "./livePcmPlayer";

describe("extractLiveAudioBase64Parts", () => {
  it("returns pcm inlineData payloads", () => {
    const parts = extractLiveAudioBase64Parts({
      serverContent: {
        modelTurn: {
          parts: [
            { text: "hi" },
            { inlineData: { mimeType: "audio/pcm;rate=24000", data: "AQID" } },
            { inlineData: { mimeType: "image/png", data: "xxxx" } },
          ],
        },
      },
    });
    expect(parts).toEqual(["AQID"]);
  });

  it("returns empty when no audio", () => {
    expect(extractLiveAudioBase64Parts({ serverContent: { modelTurn: { parts: [{ text: "x" }] } } })).toEqual(
      []
    );
  });
});

describe("base64PcmToFloat32", () => {
  it("decodes little-endian int16 samples", () => {
    // two samples: 0 and 16384 (~0.5)
    const bytes = new Uint8Array([0, 0, 0, 64]);
    let binary = "";
    for (const b of bytes) binary += String.fromCharCode(b);
    const samples = base64PcmToFloat32(btoa(binary));
    expect(samples.length).toBe(2);
    expect(samples[0]).toBe(0);
    expect(samples[1]).toBeCloseTo(0.5, 2);
  });
});
