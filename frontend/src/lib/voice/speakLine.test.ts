import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./playTts", () => ({
  speakTutorLine: vi.fn(),
  stopActiveTtsAudio: vi.fn(),
}));

import { cancelSpeech, speakLine } from "./speakLine";
import { stopActiveTtsAudio } from "./playTts";

describe("speakLine", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      speechSynthesis: {
        speak: vi.fn(),
        cancel: vi.fn(),
      },
    });
    vi.stubGlobal(
      "SpeechSynthesisUtterance",
      vi.fn(function SpeechSynthesisUtterance(
        this: { lang: string; onend?: () => void; onerror?: () => void },
        _text: string
      ) {
        this.lang = "";
        return this;
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("resolves immediately when speech synthesis is unavailable", async () => {
    vi.stubGlobal("window", {});
    await expect(speakLine("hello", "en-GB")).resolves.toBeUndefined();
  });

  it("speaks text and resolves on end", async () => {
    const speak = window.speechSynthesis.speak as ReturnType<typeof vi.fn>;
    let utterance: { onend?: () => void } = {};
    speak.mockImplementation((u: { onend?: () => void }) => {
      utterance = u;
    });

    const promise = speakLine("hello", "en-GB");
    expect(stopActiveTtsAudio).toHaveBeenCalled();
    expect(speak).toHaveBeenCalled();
    utterance.onend?.();
    await expect(promise).resolves.toBeUndefined();
  });

  it("cancelSpeech stops active synthesis and server audio", () => {
    cancelSpeech();
    expect(stopActiveTtsAudio).toHaveBeenCalled();
  });
});
