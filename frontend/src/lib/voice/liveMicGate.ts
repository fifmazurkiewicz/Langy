/** Gate Listening recognition while Gemini Live tutor audio is playing. */

export type LiveMicGate = {
  onAgentAudio: () => void;
  onTurnComplete: () => Promise<void>;
  onInterrupt: () => void;
};

const DEFAULT_SETTLE_MS = 300;

export function createLiveMicGate(opts: {
  listeningOn: () => boolean;
  setSuspended: (value: boolean) => void;
  whenIdle: () => Promise<void>;
  isIdle?: () => boolean;
  settleMs?: number;
}): LiveMicGate {
  let generation = 0;
  const settleMs = opts.settleMs ?? DEFAULT_SETTLE_MS;

  return {
    onAgentAudio() {
      generation += 1;
      if (opts.listeningOn()) {
        opts.setSuspended(true);
      }
    },
    async onTurnComplete() {
      const gen = generation;
      await opts.whenIdle();
      if (gen !== generation) return;
      if (settleMs > 0) {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, settleMs);
        });
      }
      if (gen !== generation) return;
      if (opts.isIdle && !opts.isIdle()) {
        await opts.whenIdle();
        if (gen !== generation) return;
      }
      opts.setSuspended(false);
    },
    onInterrupt() {
      generation += 1;
      opts.setSuspended(false);
    },
  };
}
