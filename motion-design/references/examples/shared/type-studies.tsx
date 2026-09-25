import type { ReactNode, CSSProperties } from "react";
import { FONT } from "../../src/primitives";

export const typeEase = "cubic-bezier(.16,1,.3,1)";
export const displayType: CSSProperties = {
  fontFamily: FONT.sans,
  fontWeight: 800,
  letterSpacing: "-.065em",
  lineHeight: 0.88,
};
export const serifType: CSSProperties = {
  fontFamily: "Georgia, 'Times New Roman', serif",
  fontWeight: 400,
  letterSpacing: "-.065em",
  lineHeight: 0.92,
};

export function TypeField({
  children,
  background,
  color,
  style,
}: {
  children: ReactNode;
  background: string;
  color: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        background,
        color,
        fontFamily: FONT.sans,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
