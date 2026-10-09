import type { CSSProperties, ReactNode } from "react";

type Easing = "out-cubic" | "out-back";

const EASE_CSS: Record<Easing, string> = {
  "out-cubic": "cubic-bezier(0.33,1,0.68,1)",
  "out-back": "cubic-bezier(0.34,1.56,0.64,1)",
};
const EASE_OUT = "cubic-bezier(0.32,0,0.67,0)";

type RevealProps = {
  enter: readonly [number, number];
  x?: number;
  y?: number;
  scaleFrom?: number;
  exit?: "transition" | readonly [number, number];
  exitY?: number;
  easeIn?: Easing;
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
  exitY = 0,
  easeIn = "out-cubic",
  style,
  className,
  children,
}: RevealProps) {
  const [inAt, inEnd] = enter;
  const animations = [`reveal-in ${inEnd - inAt}ms ${inAt}ms ${EASE_CSS[easeIn]} backwards`];
  if (exit === "transition") {
    animations.push(
      `reveal-out var(--ef-transition-duration) var(--ef-transition-out-start) ${EASE_OUT} forwards`,
    );
  } else if (exit) {
    const [outAt, outEnd] = exit;
    animations.push(`reveal-out ${outEnd - outAt}ms ${outAt}ms ${EASE_OUT} forwards`);
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
          "--reveal-exit-y": `${exitY}px`,
          animation: animations.join(", "),
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}
