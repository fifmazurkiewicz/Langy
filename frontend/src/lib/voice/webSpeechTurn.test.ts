import { describe, expect, it, vi } from "vitest";
import { bindDebouncedContinuousRecognition, SPEECH_END_SILENCE_MS } from "./webSpeechTurn";

describe("bindDebouncedContinuousRecognition", () => {
  it("commits utterance only after silence window", () => {
    vi.useFakeTimers();
    const onUtterance = vi.fn();
    const recognition = {
      interimResults: false,
      continuous: false,
      onresult: null as SpeechRecognition["onresult"],
    } as SpeechRecognition;

    bindDebouncedContinuousRecognition(recognition, onUtterance);

    recognition.onresult?.({
      resultIndex: 0,
      results: [{ 0: { transcript: "hello" }, isFinal: true, length: 1, item: () => ({ transcript: "hello" }) }],
    } as unknown as SpeechRecognitionEvent);

    expect(onUtterance).not.toHaveBeenCalled();
    vi.advanceTimersByTime(SPEECH_END_SILENCE_MS - 1);
    expect(onUtterance).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onUtterance).toHaveBeenCalledWith("hello");

    vi.useRealTimers();
  });

  it("merges rapid fragments before committing", () => {
    vi.useFakeTimers();
    const onUtterance = vi.fn();
    const recognition = {
      interimResults: false,
      continuous: false,
      onresult: null as SpeechRecognition["onresult"],
    } as SpeechRecognition;

    bindDebouncedContinuousRecognition(recognition, onUtterance);

    recognition.onresult?.({
      resultIndex: 0,
      results: [{ 0: { transcript: "I would " }, isFinal: true, length: 1, item: () => ({ transcript: "I would " }) }],
    } as unknown as SpeechRecognitionEvent);
    vi.advanceTimersByTime(400);
    recognition.onresult?.({
      resultIndex: 0,
      results: [
        { 0: { transcript: "I would " }, isFinal: true, length: 1, item: () => ({ transcript: "I would " }) },
        { 0: { transcript: "love to chat" }, isFinal: true, length: 1, item: () => ({ transcript: "love to chat" }) },
      ],
    } as unknown as SpeechRecognitionEvent);

    vi.advanceTimersByTime(SPEECH_END_SILENCE_MS);
    expect(onUtterance).toHaveBeenCalledTimes(1);
    expect(onUtterance).toHaveBeenCalledWith("I would love to chat");

    vi.useRealTimers();
  });
});
