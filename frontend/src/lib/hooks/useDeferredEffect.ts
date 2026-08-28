import { useEffect } from "react";

/** Defer effect work to a microtask — avoids sync setState inside useEffect (eslint set-state-in-effect). */
export function useDeferredEffect(effect: () => void | Promise<void>, deps: readonly unknown[]) {
  useEffect(() => {
    queueMicrotask(() => {
      void effect();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller owns dep list
  }, deps);
}
