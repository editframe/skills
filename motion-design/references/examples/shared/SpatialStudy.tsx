import type { ReactNode } from "react";
import { Solo, type Aspect } from "../../src/primitives";
export function SpatialStudy({
  id,
  aspect,
  duration,
  background = "#e9e8de",
  color = "#292c26",
  children,
}: {
  id: string;
  aspect: Aspect;
  duration: number;
  background?: string;
  color?: string;
  children: ReactNode;
}) {
  return (
    <Solo id={id} aspect={aspect} duration={duration} background={background}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          color,
          background,
          fontFamily: "Archivo, Arial, sans-serif",
        }}
      >
        {children}
      </div>
    </Solo>
  );
}
