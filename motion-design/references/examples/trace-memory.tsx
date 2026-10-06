import { Solo, type Aspect } from "../src/primitives";
import { TypeField } from "./shared/type-studies";

// Custom monoline letterforms: writing, retained pressure, then erasure along the same paths.
export const duration = 7;
export const posterTime = 3.8;
export const aspect = "landscape" as const;

const letters = [
  ["M 10 20 H 130", "M 70 20 V 210"],
  ["M 10 210 V 20 H 78 C 156 20 156 115 78 115 H 10", "M 75 115 L 140 210"],
  ["M 0 210 L 72 20 Q 76 9 80 20 L 152 210", "M 29 137 H 124"],
  ["M 142 46 C 113 0 15 7 10 106 C 5 213 105 245 144 182"],
  ["M 136 20 H 12 V 210 H 136", "M 12 113 H 117"],
];
const starts = [[0.3, 0.66], [1.03, 1.68], [1.9, 2.38], [2.54], [3.04, 3.56]];
const drawingTimes = [[0.37, 0.48], [0.73, 0.32], [0.6, 0.28], [0.68], [0.69, 0.26]];

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  const tall = frame === "portrait";
  const positions = tall
    ? [
        [35, 105],
        [225, 105],
        [415, 105],
        [128, 435],
        [328, 435],
      ]
    : [
        [35, 150],
        [228, 150],
        [421, 150],
        [627, 150],
        [825, 150],
      ];
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <TypeField
        background="#182d38"
        color="#eae6d7"
        style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <svg
          viewBox={tall ? "0 0 610 780" : "0 0 1000 530"}
          role="img"
          aria-label="TRACE written in custom monoline strokes, retaining different weights before erasing"
          style={{ width: "88%", height: tall ? "77%" : "86%", overflow: "visible" }}
        >
          {letters.map((paths, letter) => (
            <g
              key={letter}
              transform={`translate(${positions[letter][0]} ${positions[letter][1]})`}
            >
              {paths.map((d, stroke) => {
                const start = starts[letter][stroke];
                const end = start + drawingTimes[letter][stroke];
                const erase = 5.1 + letter * 0.16 + stroke * 0.08;
                const weight = [8, 13, 7, 12, 9][letter];
                const key = `trace-memory-${letter}-${stroke}`;
                return (
                  <g key={stroke}>
                    <path
                      d={d}
                      pathLength={1}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray="1 1"
                      strokeDashoffset={1}
                      style={{ animation: `${key} ${duration}s linear both` }}
                    />
                    <style>{`@keyframes ${key} {
                0%,${(start / duration) * 100}% {stroke-dashoffset:1;stroke-width:4;opacity:1;animation-timing-function:cubic-bezier(.42,0,.3,1)}
                ${(end / duration) * 100}% {stroke-dashoffset:0;stroke-width:5;animation-timing-function:ease-in-out}
                ${(Math.min(end + 0.7, 4.65) / duration) * 100}% {stroke-dashoffset:0;stroke-width:${weight}}
                ${(erase / duration) * 100}% {stroke-dashoffset:0;stroke-width:${weight};opacity:1;animation-timing-function:cubic-bezier(.55,0,.7,1)}
                ${((erase + 0.65) / duration) * 100}% {stroke-dashoffset:-1;stroke-width:2;opacity:1}
                99.9% {stroke-dashoffset:-1;stroke-width:2;opacity:0}
                100% {stroke-dashoffset:1;stroke-width:4;opacity:0}
              }`}</style>
                  </g>
                );
              })}
            </g>
          ))}
        </svg>
      </TypeField>
    </Solo>
  );
}
