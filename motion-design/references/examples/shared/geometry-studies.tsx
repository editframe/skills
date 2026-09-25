import { Timegroup } from "@editframe/react";
import type { CSSProperties, ReactNode } from "react";
import { ASPECT, FONT, type Aspect } from "../../src/primitives";

export type StudyProps = { id: string; aspect?: Aspect };
export const ease = "cubic-bezier(.76,0,.24,1)";
export const absolute: CSSProperties = { position: "absolute", inset: 0 };

/** An unadorned frame for the motion itself. */
export function GeometryStage({
  id,
  aspect,
  duration,
  background,
  ink,
  children,
}: {
  id: string;
  aspect: Aspect;
  duration: number;
  background: string;
  ink: string;
  children: ReactNode;
}) {
  const [width, height] = ASPECT[aspect];
  return (
    <Timegroup
      id={id}
      mode="fixed"
      duration={`${duration}s`}
      loop
      style={{
        position: "relative",
        width,
        height,
        overflow: "hidden",
        background,
        color: ink,
        fontFamily: FONT.sans,
      }}
    >
      {children}
    </Timegroup>
  );
}

export function Artboard({
  aspect,
  children,
  size = 720,
}: {
  aspect: Aspect;
  children: ReactNode;
  size?: number;
}) {
  const actual = aspect === "landscape" ? size : Math.min(size, 790);
  return (
    <div
      style={{
        position: "absolute",
        width: actual,
        height: actual,
        left: "50%",
        top: "50%",
        transform: "translate(-50%,-50%)",
      }}
    >
      {children}
    </div>
  );
}
