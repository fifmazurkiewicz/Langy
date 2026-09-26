import { describe, expect, it, vi } from "vitest";
import {
  bindDebouncedContinuousRecognition,
  runDebouncedRecognition,
  SPEECH_END_SILENCE_MS,
  TURN_DECISION_MAX_WAIT_MS,
  TURN_DECISION_RETRY_MS,
} from "./webSpeechTurn";

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

  it("keeps the newest repeated browser hypothesis only once", () => {
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
      results: [
        { 0: { transcript: "I would" }, isFinal: true, length: 1, item: () => ({ transcript: "I would" }) },
        {
          0: { transcript: "I would like" },
          isFinal: false,
          length: 1,
          item: () => ({ transcript: "I would like" }),
        },
        {
          0: { transcript: "I would like to practise" },
          isFinal: false,
          length: 1,
          item: () => ({ transcript: "I would like to practise" }),
        },
      ],
    } as unknown as SpeechRecognitionEvent);

    vi.advanceTimersByTime(SPEECH_END_SILENCE_MS);
    expect(onUtterance).toHaveBeenCalledWith("I would like to practise");

    vi.useRealTimers();
  });

  it("rechecks JEV every second after the first pause until the turn is complete", async () => {
    vi.useFakeTimers();
    const onUtterance = vi.fn();
    const shouldDefer = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const recognition = {
      interimResults: false,
      continuous: false,
      onresult: null as SpeechRecognition["onresult"],
    } as SpeechRecognition;

    bindDebouncedContinuousRecognition(recognition, onUtterance, SPEECH_END_SILENCE_MS, shouldDefer);
    recognition.onresult?.({
      resultIndex: 0,
      results: [{ 0: { transcript: "I would like" }, isFinal: true, length: 1, item: () => ({ transcript: "I would like" }) }],
    } as unknown as SpeechRecognitionEvent);

    await vi.advanceTimersByTimeAsync(SPEECH_END_SILENCE_MS);
    expect(shouldDefer).toHaveBeenCalledTimes(1);
    expect(onUtterance).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(TURN_DECISION_RETRY_MS);
    expect(shouldDefer).toHaveBeenCalledTimes(2);
    expect(onUtterance).toHaveBeenCalledWith("I would like");

    vi.useRealTimers();
  });

  it("commits after 15 seconds even if JEV keeps deferring", async () => {
    vi.useFakeTimers();
    const onUtterance = vi.fn();
    const shouldDefer = vi.fn().mockResolvedValue(true);
    const recognition = {
      interimResults: false,
      continuous: false,
      onresult: null as SpeechRecognition["onresult"],
    } as SpeechRecognition;

    bindDebouncedContinuousRecognition(recognition, onUtterance, SPEECH_END_SILENCE_MS, shouldDefer);
    recognition.onresult?.({
      resultIndex: 0,
      results: [{ 0: { transcript: "I am thinking" }, isFinal: true, length: 1, item: () => ({ transcript: "I am thinking" }) }],
    } as unknown as SpeechRecognitionEvent);

    await vi.advanceTimersByTimeAsync(TURN_DECISION_MAX_WAIT_MS);
    expect(onUtterance).toHaveBeenCalledWith("I am thinking");

    vi.useRealTimers();
  });
});

describe("runDebouncedRecognition", () => {
  it("commits after custom silence window", () => {
    vi.useFakeTimers();
    const onUtterance = vi.fn();
    class MockRecognition {
      lang = "";
      interimResults = false;
      continuous = false;
      onresult: SpeechRecognition["onresult"] = null;
      onerror: SpeechRecognition["onerror"] = null;
      start = vi.fn();
      stop = vi.fn();
    }

    vi.stubGlobal("window", {
      SpeechRecognition: MockRecognition,
      webkitSpeechRecognition: MockRecognition,
    });

    const handle = runDebouncedRecognition("en-GB", 2000, onUtterance);
    expect(handle).not.toBeNull();

    handle!.recognition.onresult?.({
      resultIndex: 0,
      results: [
        {
          0: { transcript: "hello world" },
          isFinal: true,
          length: 1,
          item: () => ({ transcript: "hello world" }),
        },
      ],
    } as unknown as SpeechRecognitionEvent);

    vi.advanceTimersByTime(1999);
    expect(onUtterance).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onUtterance).toHaveBeenCalledWith("hello world");
    expect(handle!.recognition.stop).toHaveBeenCalled();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
});
