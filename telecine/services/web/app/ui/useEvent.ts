import type React from "react";
import { useEffect } from "react";

export const useEvent = <K extends keyof GlobalEventHandlersEventMap>(
  ref: React.RefObject<HTMLElement | Window>,
  type: K,
  listener:
    | ((event: GlobalEventHandlersEventMap[K]) => void)
    | ((event: GlobalEventHandlersEventMap[K]) => Promise<void>),
  options?: boolean | AddEventListenerOptions,
  deps?: React.DependencyList,
): void => {
  useEffect(() => {
    const target = ref.current;
    if (!target) return;
    target.addEventListener(type, listener as EventListener, options);
    return () => {
      target.removeEventListener(type, listener as EventListener, options);
    };
  }, [type, ref, listener, options, ...(deps ?? [])]);
};
