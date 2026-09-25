import type { CSSProperties, ReactNode } from "react";

type Easing = "linear" | "out-cubic" | "in-cubic" | "in-out-quad" | "out-back";

const EASE_CSS: Record<Easing, string> = {
  linear: "linear",
  "out-cubic": "cubic-bezier(0.33,1,0.68,1)",
  "in-cubic": "cubic-bezier(0.32,0,0.67,0)",
  "in-out-quad": "cubic-bezier(0.45,0,0.55,1)",
  "out-back": "cubic-bezier(0.34,1.56,0.64,1)",
};

export type RevealProps = {
  enter: readonly [number, number];
  x?: number;
  y?: number;
  scaleFrom?: number;
  exit?: "transition" | readonly [number, number];
  exitDelay?: number;
  exitX?: number;
  exitY?: number;
  exitScale?: number;
  easeIn?: Easing;
  easeOut?: Easing;
  style?: CSSProperties;
  className?: string;
  children?: ReactNode;
};

export function Reveal({
  enter,
  x = 0,
  y = 20,
  scaleFrom = 1,
  exit,
  exitDelay = 0,
  exitX = 0,
  exitY = 0,
  exitScale = 1,
  easeIn = "out-cubic",
  easeOut = "in-cubic",
  style,
  className,
  children,
}: RevealProps) {
  const [inAt, inEnd] = enter;
  const animations = [`reveal-in ${inEnd - inAt}ms ${inAt}ms ${EASE_CSS[easeIn]} backwards`];
  if (exit === "transition") {
    const delay = exitDelay
      ? `calc(var(--ef-transition-out-start) + ${exitDelay}ms)`
      : "var(--ef-transition-out-start)";
    animations.push(
      `reveal-out var(--ef-transition-duration) ${delay} ${EASE_CSS[easeOut]} forwards`,
    );
  } else if (exit) {
    const [outAt, outEnd] = exit;
    animations.push(`reveal-out ${outEnd - outAt}ms ${outAt}ms ${EASE_CSS[easeOut]} forwards`);
  }
  return (
    <div
      className={className}
      style={
        {
          ...style,
          "--reveal-x": `${x}px`,
          "--reveal-y": `${y}px`,
          "--reveal-scale-from": scaleFrom,
          "--reveal-exit-x": `${exitX}px`,
          "--reveal-exit-y": `${exitY}px`,
          "--reveal-exit-scale": exitScale,
          animation: animations.join(", "),
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}
