import type { CSSProperties } from "react";
import { CORAL, CORAL_DEEP, CREAM } from "./tokens";

export function Grain({ opacity = 0.14 }: { opacity?: number }) {
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        opacity,
        mixBlendMode: "overlay",
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.55'/></svg>\")",
        backgroundSize: "160px 160px",
      }}
    />
  );
}

export function Vignette({ strength = 0.45 }: { strength?: number }) {
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        background: `radial-gradient(ellipse at 50% 40%, transparent 35%, rgba(0,0,0,${strength}) 100%)`,
      }}
    />
  );
}

export function Sunburst({
  rays = 28,
  colorA = CORAL_DEEP,
  colorB = CORAL,
}: {
  rays?: number;
  colorA?: string;
  colorB?: string;
  size?: number;
}) {
  const step = 360 / rays;
  const r = 1200;
  const wedges = Array.from({ length: rays }, (_, i) => {
    const a0 = ((i * step - 90) * Math.PI) / 180;
    const a1 = (((i + 1) * step - 90) * Math.PI) / 180;
    return `M 0 0 L ${r * Math.cos(a0)} ${r * Math.sin(a0)} L ${r * Math.cos(a1)} ${r * Math.sin(a1)} Z`;
  });
  return (
    <svg
      viewBox="-1200 -1200 2400 2400"
      className="pointer-events-none absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2"
      style={{ width: "180%", height: "180%" }}
    >
      {wedges.map((d, i) => (
        <path key={i} d={d} fill={i % 2 === 0 ? colorA : colorB} />
      ))}
    </svg>
  );
}

export function Rings({
  count = 6,
  stroke = CREAM,
}: {
  count?: number;
  gap?: number;
  stroke?: string;
  sw?: number;
  start?: number;
}) {
  return (
    <svg
      viewBox="0 0 1000 1000"
      className="pointer-events-none absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2"
      style={{ width: "130%", height: "130%" }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <circle
          key={i}
          cx="500"
          cy="500"
          r={140 + i * 55}
          fill="none"
          stroke={stroke}
          strokeWidth="6"
          opacity={0.88 - i * 0.1}
        />
      ))}
    </svg>
  );
}

const BUBBLES = [
  { x: -300, s: 30, speed: 1700, delay: 0 },
  { x: -160, s: 18, speed: 2060, delay: -762 },
  { x: 220, s: 26, speed: 2420, delay: -1791 },
  { x: 320, s: 40, speed: 2780, delay: -306 },
  { x: -360, s: 16, speed: 3140, delay: -1507 },
  { x: 140, s: 22, speed: 3500, delay: -2975 },
  { x: -60, s: 34, speed: 3860, delay: -849 },
  { x: 380, s: 14, speed: 4220, delay: -2490 },
];

export function Bubbles({ color = CREAM }: { color?: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {BUBBLES.map((b, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={
            {
              left: "50%",
              top: 0,
              width: `calc(${b.s} * 0.12cqw)`,
              height: `calc(${b.s} * 0.12cqw)`,
              marginLeft: `${(b.x / 1920) * 100}%`,
              background: `radial-gradient(circle at 32% 30%, rgba(255,255,255,0.95), ${color} 70%)`,
              boxShadow: `0 0 ${b.s * 0.5}px ${color}66`,
              "--bubble-x": "0px",
              animation: `bubble-rise ${b.speed}ms linear ${b.delay}ms infinite`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

export function GroundShadow({ width = 460 }: { width?: number }) {
  return (
    <div
      className="absolute left-1/2 -translate-x-1/2"
      style={{
        bottom: "14%",
        width: width ? `${Math.min(52, (width / 1920) * 100)}%` : "42%",
        height: "8cqh",
        borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(15,20,18,0.5), transparent 70%)",
      }}
    />
  );
}
