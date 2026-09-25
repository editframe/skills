import type { CSSProperties, ReactNode } from "react";
import { Solo, FONT, PAPER, INK, MUTED, CursorGlyph, type Aspect } from "../../src/primitives";

export const focus = {
  paper: PAPER,
  ink: "#202733",
  muted: "#6c7685",
  line: "#dce1e8",
  blue: "#4263df",
  green: "#287b64",
  lilac: "#eef2ff",
};
export const motion = (name: string, seconds: number): CSSProperties => ({
  animation: `${name} ${seconds}s linear both`,
});
export function Label({
  x = 0,
  y = 0,
  children,
  size = 20,
  color = INK,
  weight = 400,
}: {
  x?: number;
  y?: number;
  children: ReactNode;
  size?: number;
  color?: string;
  weight?: number;
}) {
  return (
    <text x={x} y={y} fontSize={size} fill={color} fontWeight={weight}>
      {children}
    </text>
  );
}
export function Box({
  x = 0,
  y = 0,
  w = 720,
  h = 100,
  fill = "#fff",
  stroke = focus.line,
  radius = 12,
}: {
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  fill?: string;
  stroke?: string;
  radius?: number;
}) {
  return (
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      rx={radius}
      fill={fill}
      stroke={stroke}
      strokeWidth="1"
      style={w === 720 ? { filter: "drop-shadow(0 7px 13px #2027330a)" } : undefined}
    />
  );
}
export function Pointer({
  color = focus.ink,
  label,
  kind = "arrow",
}: {
  color?: string;
  label?: string;
  kind?: "arrow" | "grab";
}) {
  return (
    <g>
      <g transform="scale(.8)">
        <CursorGlyph color={color} kind={kind} />
      </g>
      {label && (
        <g transform="translate(14 23)">
          <rect width="61" height="25" rx="6" fill={color} />
          <Label x={9} y={17} size={13} color="white" weight={600}>
            {label}
          </Label>
        </g>
      )}
    </g>
  );
}
export function TypedText({
  id,
  text,
  x,
  y,
  size = 22,
  duration,
  times,
  caret = true,
}: {
  id: string;
  text: string;
  x: number;
  y: number;
  size?: number;
  duration: number;
  times: number[];
  caret?: boolean;
}) {
  const name = id.replace(/[^a-zA-Z0-9-]/g, "");
  return (
    <g transform={`translate(${x} ${y})`} fontFamily={FONT.ui}>
      {Array.from({ length: text.length + 1 }, (_, i) => (
        <text
          key={i}
          fontSize={size}
          fill={focus.ink}
          style={motion(`${name}-prefix-${i}`, duration)}
        >
          {text.slice(0, i)}
          {caret && (
            <tspan fill={focus.blue} style={motion(`${name}-blink`, duration)}>
              │
            </tspan>
          )}
        </text>
      ))}
      <style>
        {Array.from({ length: text.length + 1 }, (_, i) => {
          const start = i ? times[i - 1] : 0,
            end = times[i] ?? 100.001;
          return `@keyframes ${name}-prefix-${i}{0%{opacity:${i ? 0 : 1}}${i ? `${start - 0.001}%{opacity:0}` : ""}${start}%{opacity:1}${end - 0.001}%{opacity:1}${end}%,100%{opacity:0}}`;
        }).join("") +
          `@keyframes ${name}-blink{0%,${times.at(-1)! + 3}%{opacity:1}66%,70%,80%,84%{opacity:0}71%,79%,85%,100%{opacity:1}}`}
      </style>
    </g>
  );
}
export function AppHeader({
  section,
  detail = "Northstar / Website",
}: {
  section: string;
  detail?: string;
}) {
  return (
    <g>
      <path d="M0 52H720" stroke={focus.line} />
      <rect x="23" y="17" width="20" height="20" rx="5" fill={focus.ink} />
      <path d="m28 31 5-9 5 9m-8-3h6" fill="none" stroke="white" strokeWidth="1.2" />
      <Label x={55} y={32} size={13} color={focus.muted}>
        {detail}
      </Label>
      <Label x={310} y={32} size={13} weight={500}>
        {section}
      </Label>
      <circle cx="669" cy="26" r="11" fill="#e9edf5" />
      <Label x={661} y={30} size={10} weight={600}>
        JL
      </Label>
    </g>
  );
}
export function Avatar({
  x,
  y,
  initials,
  color = focus.blue,
}: {
  x: number;
  y: number;
  initials: string;
  color?: string;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r="11" fill={color} />
      <text textAnchor="middle" y="3.5" fill="white" fontSize="9" fontWeight="600">
        {initials}
      </text>
    </g>
  );
}

export function FocusStudy({
  id,
  aspect,
  duration,
  title,
  note,
  children,
}: {
  id: string;
  aspect: Aspect;
  duration: number;
  title: string;
  note: string;
  children: (h: number, tall: boolean) => ReactNode;
}) {
  const tall = aspect === "portrait";
  const w = tall ? 600 : 1000;
  const h = tall ? 1066.67 : aspect === "square" ? 1000 : 562.5;
  const bodyH = tall ? 640 : aspect === "square" ? 410 : 340;
  const scale = (w - 100) / 720;
  const y = (h - bodyH * scale) / 2;
  return (
    <Solo id={id} aspect={aspect} duration={duration} background="#edf0f5">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label={`${title}. ${note}`}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          background: "#edf0f5",
          fontFamily: FONT.ui,
        }}
      >
        <Label x={50} y={y - 38} size={tall ? 23 : 25} weight={600}>
          {title}
        </Label>
        <g transform={`translate(50 ${y}) scale(${scale})`}>
          <g style={motion("focus-study-cycle", duration)}>{children(bodyH, tall)}</g>
        </g>
        <Label x={50} y={y + bodyH * scale + 40} size={tall ? 16 : 17} color={MUTED}>
          {note}
        </Label>
        <style>{`@keyframes focus-study-cycle {0%{opacity:0}4%,93%{opacity:1}99%,100%{opacity:0}}`}</style>
      </svg>
    </Solo>
  );
}
