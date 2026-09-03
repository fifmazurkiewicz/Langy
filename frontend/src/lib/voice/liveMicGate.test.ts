import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createLiveMicGate } from "./liveMicGate";

describe("createLiveMicGate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("suspends on agent audio when listening is on", () => {
    const setSuspended = vi.fn();
    const gate = createLiveMicGate({
      listeningOn: () => true,
      setSuspended,
      whenIdle: async () => undefined,
      settleMs: 0,
    });
    gate.onAgentAudio();
    expect(setSuspended).toHaveBeenCalledWith(true);
  });

  it("does not suspend when listening is off", () => {
    const setSuspended = vi.fn();
    const gate = createLiveMicGate({
      listeningOn: () => false,
      setSuspended,
      whenIdle: async () => undefined,
      settleMs: 0,
    });
    gate.onAgentAudio();
    expect(setSuspended).not.toHaveBeenCalled();
  });

  it("clears suspend after turn complete, idle, and settle", async () => {
    const setSuspended = vi.fn();
    let resolveIdle!: () => void;
    const whenIdle = () =>
      new Promise<void>((resolve) => {
        resolveIdle = resolve;
      });
    const gate = createLiveMicGate({
      listeningOn: () => true,
      setSuspended,
      whenIdle,
      settleMs: 300,
    });
    gate.onAgentAudio();
    const done = gate.onTurnComplete();
    expect(setSuspended).toHaveBeenCalledWith(true);
    resolveIdle();
    await vi.advanceTimersByTimeAsync(300);
    await done;
    expect(setSuspended).toHaveBeenCalledWith(false);
  });

  it("does not clear suspend if new audio arrives before settle finishes", async () => {
    const setSuspended = vi.fn();
    const idleResolvers: Array<() => void> = [];
    const whenIdle = () =>
      new Promise<void>((resolve) => {
        idleResolvers.push(resolve);
      });
    const gate = createLiveMicGate({
      listeningOn: () => true,
      setSuspended,
      whenIdle,
      settleMs: 300,
    });
    gate.onAgentAudio();
    const first = gate.onTurnComplete();
    idleResolvers[0]?.();
    await Promise.resolve();
    gate.onAgentAudio();
    await vi.advanceTimersByTimeAsync(300);
    await first;
    expect(setSuspended.mock.calls.filter((c) => c[0] === false)).toHaveLength(0);

    const second = gate.onTurnComplete();
    idleResolvers[1]?.();
    await vi.advanceTimersByTimeAsync(300);
    await second;
    expect(setSuspended).toHaveBeenCalledWith(false);
  });

  it("interrupt clears suspend immediately and cancels pending idle release", async () => {
    const setSuspended = vi.fn();
    let resolveIdle!: () => void;
    const whenIdle = () =>
      new Promise<void>((resolve) => {
        resolveIdle = resolve;
      });
    const gate = createLiveMicGate({
      listeningOn: () => true,
      setSuspended,
      whenIdle,
      settleMs: 300,
    });
    gate.onAgentAudio();
    const pending = gate.onTurnComplete();
    gate.onInterrupt();
    expect(setSuspended).toHaveBeenCalledWith(false);
    resolveIdle();
    await vi.advanceTimersByTimeAsync(300);
    await pending;
    const falseCalls = setSuspended.mock.calls.filter((c) => c[0] === false);
    expect(falseCalls).toHaveLength(1);
  });
});
