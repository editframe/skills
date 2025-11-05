import { useEffect } from "react";

export const useAnimationframe = (callback: () => void): void => {
  useEffect(() => {
    let animationFrameId: number;
    let cancelled = false;
    const tick = (): void => {
      if (cancelled) return;
      animationFrameId = requestAnimationFrame(tick);
      callback();
    };
    tick();
    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrameId);
    };
  }, [callback]);
};
