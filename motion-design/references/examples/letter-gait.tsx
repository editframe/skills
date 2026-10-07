import { Timegroup } from "@editframe/react";
import type { EFTimegroupElement } from "@editframe/elements";
import { Solo, type Aspect } from "../src/primitives";
import { TypeField } from "./shared/type-studies";

// Original articulated alphabet. The lower strokes ARE the moving structure;
// there are no appendages, borrowed glyph outlines, or reference media.
export const duration = 5.4;
export const posterTime = 2.05;
export const aspect = "landscape" as const;

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const smooth = (n: number) => {
  const p = clamp(n);
  return p * p * (3 - 2 * p);
};
type Point = [number, number];
type Command = ["M" | "L" | "Q" | "C", ...number[]];
const GLYPHS: Command[][] = [
  [
    ["M", 0, 180],
    ["L", 0, 90],
    ["L", 0, 0],
    ["L", 64, 0],
    ["C", 133, 0, 133, 82, 64, 82],
    ["L", 0, 82],
    ["M", 59, 83],
    ["L", 86, 129],
    ["L", 120, 180],
  ],
  [
    ["M", 60, 180],
    ["C", 20, 180, 0, 153, 0, 105],
    ["L", 0, 73],
    ["C", 0, 25, 20, 0, 60, 0],
    ["C", 100, 0, 120, 25, 120, 73],
    ["L", 120, 105],
    ["C", 120, 153, 100, 180, 60, 180],
  ],
  [
    ["M", 0, 180],
    ["L", 28, 99],
    ["L", 60, 0],
    ["L", 92, 99],
    ["L", 120, 180],
    ["M", 24, 113],
    ["L", 96, 113],
  ],
  [
    ["M", 0, 180],
    ["L", 0, 94],
    ["L", 0, 0],
    ["L", 60, 106],
    ["L", 120, 0],
    ["L", 120, 94],
    ["L", 120, 180],
  ],
];

function pose(time: number, index: number) {
  // Quiet reading poses bookend two complete transfers. The envelope makes
  // both velocity and geometry return to rest before the timeline wraps.
  const envelope = smooth((time - 0.4) / 0.55) * (1 - smooth((time - 4.15) / 0.65));
  const phase = ((time - 0.6) * Math.PI * 2) / 1.65 - index * 0.66;
  const left = Math.max(0, Math.sin(phase));
  const right = Math.max(0, -Math.sin(phase));
  return { envelope, phase, left, right };
}

function glyphPath(index: number, time: number) {
  const { envelope: e, phase, left, right } = pose(time, index);
  const point = (x: number, y: number): Point => {
    const side = clamp(x / 120);
    const lower = smooth((y - 65) / 115);
    const lift = left * (1 - side) + right * side;
    const footX = 22 * Math.sin(phase * 2) * (left * (1 - side) - right * side);
    const bodyX = 12 * Math.sin(phase - 0.22);
    const bodyY = -7 * Math.abs(Math.sin(phase));
    // The bent middle of a stem lags its planted terminal, then straightens
    // as that terminal takes the load. Counters share the upper body motion.
    const hinge = Math.sin(Math.PI * lower) * 15 * Math.sin(phase + side * 0.9);
    return [
      x + e * ((1 - lower) * bodyX + lower * footX + hinge),
      y + e * ((1 - lower) * bodyY - lower * lift * 25),
    ];
  };
  return GLYPHS[index]
    .map(([command, ...coords]) => {
      const pairs = [];
      for (let i = 0; i < coords.length; i += 2) {
        pairs.push(
          point(coords[i], coords[i + 1])
            .map((n) => n.toFixed(3))
            .join(","),
        );
      }
      return `${command}${pairs.join(" ")}`;
    })
    .join(" ");
}

function initialize(root: EFTimegroupElement) {
  const paths = Array.from(root.querySelectorAll<SVGPathElement>("[data-gait-glyph]"));
  const shadows = Array.from(root.querySelectorAll<SVGEllipseElement>("[data-gait-shadow]"));
  const draw = (time: number) => {
    paths.forEach((path, i) => {
      path.setAttribute("d", glyphPath(i, time));
      const p = pose(time, i);
      shadows[i]?.setAttribute("rx", String(67 - p.envelope * 10 * Math.abs(Math.sin(p.phase))));
      shadows[i]?.setAttribute(
        "opacity",
        String(0.13 - p.envelope * 0.045 * Math.abs(Math.sin(p.phase))),
      );
    });
  };
  draw(0);
  root.addFrameTask(({ ownCurrentTime }) => draw(ownCurrentTime));
}

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  const portrait = frame === "portrait";
  const positions = portrait
    ? [
        [112, 130],
        [332, 130],
        [112, 460],
        [332, 460],
      ]
    : [
        [150, 190],
        [365, 190],
        [580, 190],
        [795, 190],
      ];

  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <TypeField background="#ee6944" color="#391f2a">
        <Timegroup
          mode="fixed"
          duration={`${duration}s`}
          initializer={initialize}
          className="absolute inset-0"
        >
          <svg
            viewBox={portrait ? "0 0 560 840" : "0 0 1080 560"}
            width="100%"
            height="100%"
            role="img"
            aria-label="ROAM, custom letters shifting their weight through articulated strokes"
          >
            {positions.map(([x, y], i) => (
              <g key={i} transform={`translate(${x},${y})`}>
                <ellipse
                  data-gait-shadow=""
                  cx="60"
                  cy="210"
                  rx="67"
                  ry="7"
                  fill="#391f2a"
                  opacity=".13"
                />
                <path
                  data-gait-glyph=""
                  d={glyphPath(i, 0)}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="32"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            ))}
          </svg>
        </Timegroup>
      </TypeField>
    </Solo>
  );
}
