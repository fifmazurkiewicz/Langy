"use client";

import { useEffect } from "react";

type WakeLockSentinel = EventTarget & { release(): Promise<void> };
type WakeLockNavigator = Navigator & {
  wakeLock?: { request(type: "screen"): Promise<WakeLockSentinel> };
};

/** Keep the display awake only while a live chat session is open. */
export function useScreenWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof navigator === "undefined") return;

    const wakeLock = (navigator as WakeLockNavigator).wakeLock;
    if (!wakeLock) return;

    let released = false;
    let sentinel: WakeLockSentinel | null = null;

    const request = async () => {
      if (released || document.visibilityState !== "visible" || sentinel) return;
      try {
        const nextSentinel = await wakeLock.request("screen");
        if (released) {
          void nextSentinel.release();
          return;
        }
        sentinel = nextSentinel;
        nextSentinel.addEventListener("release", () => {
          sentinel = null;
        });
      } catch {
        // The browser may deny Wake Lock (for example, low battery mode).
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void request();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    void request();
    return () => {
      released = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      void sentinel?.release();
    };
  }, [active]);
}
