import type { CSSProperties } from "react";
import { Solo, type Aspect } from "../src/primitives";
import { TypeField } from "./shared/type-studies";

// Original line alphabet. Every half-stroke is also one edge of the closing lattice.
export const duration = 7.2;
export const posterTime = 2.7;
export const aspect = "landscape" as const;

type Segment = [number, number, number, number];
const glyphs: Segment[][] = [
  [
    [0, 200, 0, 0],
    [0, 0, 80, 110],
    [80, 110, 160, 0],
    [160, 0, 160, 200],
  ],
  [
    [0, 0, 0, 200],
    [0, 0, 140, 0],
    [0, 100, 115, 100],
    [0, 200, 140, 200],
  ],
  [
    [140, 0, 0, 0],
    [0, 0, 0, 100],
    [0, 100, 140, 100],
    [140, 100, 140, 200],
    [140, 200, 0, 200],
  ],
  [
    [0, 0, 0, 200],
    [160, 0, 160, 200],
    [0, 100, 160, 100],
  ],
];

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  const tall = frame === "portrait";
  const positions = tall
    ? [
        [100, 190],
        [350, 190],
        [100, 570],
        [350, 570],
      ]
    : [
        [70, 210],
        [290, 210],
        [500, 210],
        [720, 210],
      ];
  const modules = glyphs.flatMap((glyph, letter) =>
    glyph.flatMap(([x1, y1, x2, y2]) => {
      const [ox, oy] = positions[letter];
      return [0, 1].map((half) => ({
        x: ox + x1 + (x2 - x1) * (0.25 + half * 0.5),
        y: oy + y1 + (y2 - y1) * (0.25 + half * 0.5),
        angle: (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI,
        length: Math.hypot(x2 - x1, y2 - y1) / 2,
        letter,
      }));
    }),
  );
  const columns = tall ? 4 : 8;
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <TypeField
        background="#e7e7df"
        color="#212725"
        style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <svg
          viewBox={tall ? "0 0 600 960" : "0 0 1000 620"}
          role="img"
          aria-label="MESH, constructed from line modules that become a lattice"
          style={{ width: tall ? "90%" : "91%", height: tall ? "83%" : "88%", overflow: "visible" }}
        >
          {modules.map((module, index) => {
            const col = index % columns;
            const row = Math.floor(index / columns);
            const latticeX = (tall ? 135 : 115) + col * 110;
            const latticeY = (tall ? 95 : 145) + row * 110;
            const latticeAngle = (col + row) % 2 ? -45 : 45;
            const start = `translate(${latticeX}px, ${latticeY}px) rotate(${latticeAngle}deg) scaleX(1.555635)`;
            const word = `translate(${module.x}px, ${module.y}px) rotate(${module.angle}deg) scaleX(${module.length / 100})`;
            // The outer letters resolve first; the S completes the reading a little later.
            const arrival = 24 + [0, 1.5, 4, 2][module.letter] + (index % 2) * 0.8;
            return (
              <g
                key={index}
                style={
                  { animation: `foundry-module-${index} ${duration}s linear both` } as CSSProperties
                }
              >
                <line
                  x1={-50}
                  x2={50}
                  y1={0}
                  y2={0}
                  stroke="currentColor"
                  strokeWidth={11}
                  strokeLinecap="square"
                  vectorEffect="non-scaling-stroke"
                  style={{ animation: `foundry-weight ${duration}s linear both` }}
                />
                <style>{`@keyframes foundry-module-${index} {
              0%,7% {transform:${start};animation-timing-function:cubic-bezier(.72,0,.16,1)}
              ${arrival}%,51% {transform:${word};animation-timing-function:cubic-bezier(.76,0,.24,1)}
              ${73 + (index % 4) * 1.2}%,100% {transform:${start}}
            }`}</style>
              </g>
            );
          })}
        </svg>
        <style>{`@keyframes foundry-weight {0%,8%{stroke-width:5}28%,51%{stroke-width:11}78%,100%{stroke-width:5}}`}</style>
      </TypeField>
    </Solo>
  );
}
