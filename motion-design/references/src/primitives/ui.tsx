import type { CSSProperties, ReactNode } from "react";
import { useAspect } from "./Stage";
import { CursorGlyph } from "./CursorGlyph";
import {
  ACCENT,
  CREAM,
  FONT,
  GOLD,
  INK,
  LINE,
  MUTED,
  NAVY,
  NIGHT_RAISE,
  SELECT,
  SUCCESS,
} from "./tokens";

export function StudyMarker({ letter = "01", size = 96 }: { letter?: string; size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        background: INK,
        border: "2px solid rgba(255,255,255,0.6)",
        fontSize: size * 0.32,
        fontFamily: FONT.mono,
      }}
    >
      {letter}
    </div>
  );
}

const CAN_SIZE = {
  hero: { landscape: [380, 640], portrait: [500, 840], square: [400, 680] },
  lineup: { landscape: [280, 470], portrait: [250, 420], square: [230, 390] },
  pack: { landscape: [220, 370], portrait: [210, 350], square: [200, 340] },
} as const;

export function ProductCan({
  color = "#1a1210",
  label = "01",
  name = "CLASSIC",
  size = "hero",
  width,
  height,
}: {
  color?: string;
  label?: string;
  name?: string;
  size?: keyof typeof CAN_SIZE;
  width?: number;
  height?: number;
}) {
  const aspect = useAspect();
  const [dw, dh] = CAN_SIZE[size][aspect];
  // The composition is already scaled by its player. Canvas-relative heights here
  // inflate artwork inside fixed-size cards, especially on portrait canvases.
  const w = width ?? (height === undefined ? dw : (height * dw) / dh);
  const h = height ?? (width === undefined ? dh : (width * dh) / dw);
  const ink = `${label}-${color.replace("#", "")}`;
  return (
    <div
      className="relative"
      style={{
        width: w,
        height: h,
        filter: "drop-shadow(0 2cqh 3cqh rgba(12,16,14,0.45))",
      }}
    >
      <svg viewBox="0 0 220 420" width="100%" height="100%" aria-hidden>
        <defs>
          <linearGradient id={`can-metal-${ink}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#6d6964" />
            <stop offset="14%" stopColor="#d8d3ca" />
            <stop offset="28%" stopColor="#f7f3ea" />
            <stop offset="42%" stopColor="#b8b2a8" />
            <stop offset="58%" stopColor="#ece7de" />
            <stop offset="76%" stopColor="#fbf7ef" />
            <stop offset="90%" stopColor="#8f8a82" />
            <stop offset="100%" stopColor="#4e4a46" />
          </linearGradient>
          <linearGradient id={`can-lid-${ink}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fffaf1" />
            <stop offset="45%" stopColor="#c9c3b8" />
            <stop offset="100%" stopColor="#8a857c" />
          </linearGradient>
          <linearGradient id={`can-label-${ink}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor="#111" />
          </linearGradient>
        </defs>
        <ellipse cx="110" cy="404" rx="70" ry="10" fill="rgba(0,0,0,0.28)" />
        <rect x="38" y="36" width="144" height="350" rx="36" fill={`url(#can-metal-${ink})`} />
        <rect x="46" y="128" width="128" height="168" rx="8" fill={`url(#can-label-${ink})`} />
        <rect x="46" y="128" width="128" height="168" rx="8" fill="rgba(255,255,255,0.06)" />
        <text
          x="110"
          y="198"
          textAnchor="middle"
          fill="#fff6e8"
          style={{
            fontFamily: FONT.serif,
            fontSize: 54,
            fontWeight: 700,
            letterSpacing: "-0.05em",
          }}
        >
          {label}
        </text>
        <text
          x="110"
          y="236"
          textAnchor="middle"
          fill="#fff6e8"
          style={{ fontFamily: FONT.sans, fontSize: 16, fontWeight: 700, letterSpacing: "0.28em" }}
        >
          {name}
        </text>
        <rect
          x="68"
          y="36"
          width="22"
          height="350"
          rx="8"
          fill="rgba(255,255,255,0.34)"
          opacity="0.55"
        />
        <ellipse cx="110" cy="36" rx="72" ry="16" fill={`url(#can-lid-${ink})`} />
        <ellipse cx="110" cy="30" rx="28" ry="7" fill="none" stroke="#9a958c" strokeWidth="3" />
        <rect x="104" y="18" width="12" height="18" rx="4" fill="#d8d3ca" />
        <ellipse cx="110" cy="386" rx="70" ry="12" fill="#8f8a82" />
        <ellipse cx="110" cy="382" rx="62" ry="7" fill="#c9c3b8" />
      </svg>
    </div>
  );
}

export function Check({
  delay = 0,
  size = 48,
  tone = "success",
}: {
  delay?: number;
  size?: number;
  tone?: "success" | "light";
}) {
  const fill = tone === "light" ? "#fff" : SUCCESS;
  const stroke = tone === "light" ? "#111" : "#fff";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      style={{ animation: `check-pop 180ms ${delay}ms cubic-bezier(0.34,1.56,0.64,1) both` }}
    >
      <circle cx="24" cy="24" r="20" fill={fill} />
      <path
        d="M15 24.5 l7 7 l12 -14"
        fill="none"
        stroke={stroke}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Spinner({ size = 48 }: { size?: number }) {
  const c = size / 2;
  const spokes = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    return {
      x1: c + size * 0.22 * Math.cos(a),
      y1: c + size * 0.22 * Math.sin(a),
      x2: c + size * 0.38 * Math.cos(a),
      y2: c + size * 0.38 * Math.sin(a),
      opacity: 1 - i * 0.1,
    };
  });
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ animation: "spin 700ms linear infinite" }}
    >
      {spokes.map((s, i) => (
        <line
          key={i}
          x1={s.x1}
          y1={s.y1}
          x2={s.x2}
          y2={s.y2}
          stroke="white"
          strokeWidth={Math.max(2.5, size / 16)}
          strokeLinecap="round"
          opacity={s.opacity}
        />
      ))}
    </svg>
  );
}

export function Cursor({
  x = 0,
  y = 0,
  delay = 0,
  duration = 600,
}: {
  x?: number;
  y?: number;
  delay?: number;
  duration?: number;
}) {
  return (
    <div
      className="pointer-events-none absolute z-20"
      style={
        {
          left: x,
          top: y,
          animation: `catalog-cursor-approach ${duration}ms ${delay}ms both`,
        } as CSSProperties
      }
    >
      <svg width="22" height="30" viewBox="0 0 22 30" style={{ overflow: "visible" }}>
        <CursorGlyph />
      </svg>
      <style>{`@keyframes catalog-cursor-approach {0%{opacity:0;transform:translate(92px,38px)}8%{opacity:1;transform:translate(92px,38px);animation-timing-function:cubic-bezier(.16,.6,.3,1)}78%{opacity:1;transform:translate(2px,1px);animation-timing-function:ease-out}100%{opacity:1;transform:translate(0,0)}}`}</style>
    </div>
  );
}

export function Card({
  children,
  className,
  style,
}: {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={["rounded-2xl", className].filter(Boolean).join(" ")}
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
        backdropFilter: "blur(10px)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Chip({
  children,
  active = false,
  delay = 0,
}: {
  children?: ReactNode;
  active?: boolean;
  delay?: number;
}) {
  return (
    <span
      className="inline-flex items-center rounded-full px-6 py-2.5 text-xl font-medium"
      style={{
        background: active ? SELECT : "rgba(255,255,255,0.08)",
        color: active ? "#fff" : "inherit",
        border: `1px solid ${active ? SELECT : "rgba(255,255,255,0.14)"}`,
        animation: `tile-reveal 280ms ${delay}ms cubic-bezier(0.33,1,0.68,1) both`,
      }}
    >
      {children}
    </span>
  );
}

export function Price({ value = "$12", delay = 400 }: { value?: string; delay?: number }) {
  return (
    <div
      className="tracking-tight"
      style={{
        fontFamily: FONT.serif,
        fontSize: "10cqh",
        fontWeight: 700,
        animation: `reveal-in 400ms ${delay}ms cubic-bezier(0.33,1,0.68,1) both`,
      }}
    >
      {value}
    </div>
  );
}

export function DisplayText({
  children,
  size = 140,
  serif = true,
}: {
  children: ReactNode;
  size?: number;
  serif?: boolean;
}) {
  // Keep display copy within the canvas when a landscape example is viewed in portrait.
  const textLength =
    typeof children === "string" ? Math.max(...children.split("\n").map((line) => line.length)) : 0;
  const widthLimit = textLength ? Math.min(18, 80 / (textLength * 0.65)) : 18;
  return (
    <div
      className="tracking-tight"
      style={{
        fontSize: `min(max(${size * 0.12}cqh, ${size * 0.35}px), ${widthLimit}cqw)`,
        letterSpacing: "-0.045em",
        fontWeight: 700,
        fontFamily: serif ? FONT.serif : FONT.sans,
      }}
    >
      {children}
    </div>
  );
}

export function Kicker({ children }: { children?: ReactNode }) {
  return (
    <div
      className="uppercase"
      style={{
        fontSize: "2.6cqh",
        letterSpacing: "0.2em",
        fontWeight: 700,
        fontFamily: FONT.sans,
        opacity: 0.78,
      }}
    >
      {children}
    </div>
  );
}

export function Window({
  title = "workspace",
  children,
  width = 1040,
  height = 640,
}: {
  title?: string;
  children?: ReactNode;
  width?: number;
  height?: number;
}) {
  return (
    <div
      className="overflow-hidden"
      style={{
        width,
        height,
        borderRadius: 16,
        background: NIGHT_RAISE,
        color: "#f4f1ea",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 40px 80px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)",
      }}
    >
      <div
        className="flex items-center gap-2 px-4"
        style={{
          height: 44,
          background: "#111114",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#ff5f57" }} />
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: GOLD }} />
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: SUCCESS }} />
        <span className="ml-3 text-xs" style={{ fontFamily: FONT.mono, color: MUTED }}>
          {title}
        </span>
      </div>
      <div className="relative h-[calc(100%-44px)]">{children}</div>
    </div>
  );
}

export function Mono({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <span className={className} style={{ fontFamily: FONT.mono }}>
      {children}
    </span>
  );
}

/** Matches the public Editframe wordmark; scale its container rather than distorting the letters. */
export function EditframeWordmark({ size = 100 }: { size?: number }) {
  return (
    <div
      style={{
        fontFamily: FONT.ui,
        fontWeight: 900,
        fontSize: `min(${size * 0.12}cqh, ${size * 0.1}cqw)`,
        letterSpacing: "-.05em",
        lineHeight: 1.05,
        whiteSpace: "nowrap",
      }}
    >
      EDITFRAME
    </div>
  );
}
