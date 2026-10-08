import { Timegroup } from "@editframe/react";
import type { EFTimegroupElement } from "@editframe/elements";
import { ASPECT, FONT, type Aspect } from "../src/primitives";

export const duration = 8;
export const posterTime = 1.8;
export const aspect = "landscape" as const;
const phrase = Array.from("AROUND AGAIN · AROUND AGAIN · ");

// Typeset by arc length, not angle: the changing curvature must not crush letters.
function initialize(root: EFTimegroupElement) {
  const letters = Array.from(root.querySelectorAll<SVGGElement>("[data-orbit-letter]"));
  root.addFrameTask(({ ownCurrentTime }) => {
    const phase = (ownCurrentTime / duration) * Math.PI * 2;
    const stretch = (1 - Math.cos(phase)) / 2;
    const rx = 335 - stretch * 105;
    const ry = 205 + stretch * 85;
    const shear = Math.sin(phase) * 75;
    const points = Array.from({ length: 361 }, (_, i) => {
      const a = (i / 360) * Math.PI * 2;
      return { x: rx * Math.cos(a) + shear * Math.sin(a), y: ry * Math.sin(a), a, distance: 0 };
    });
    for (let i = 1; i < points.length; i++)
      points[i].distance =
        points[i - 1].distance +
        Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    const length = points[360].distance;
    letters.forEach((letter, i) => {
      const travel = ((i / letters.length + ownCurrentTime / duration) % 1) * length;
      const n = Math.max(
        1,
        points.findIndex((p) => p.distance >= travel),
      );
      const before = points[n - 1],
        after = points[n];
      const f = (travel - before.distance) / (after.distance - before.distance);
      const a = before.a + (after.a - before.a) * f;
      const x = 500 + rx * Math.cos(a) + shear * Math.sin(a);
      const y = 420 + ry * Math.sin(a);
      const angle =
        (Math.atan2(ry * Math.cos(a), -rx * Math.sin(a) + shear * Math.cos(a)) * 180) / Math.PI;
      letter.setAttribute("transform", `translate(${x} ${y}) rotate(${angle})`);
    });
  });
}

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  const [width, height] = ASPECT[frame];
  return (
    <Timegroup
      id={id}
      mode="fixed"
      duration={`${duration}s`}
      loop
      initializer={initialize}
      style={{ width, height, position: "relative", overflow: "hidden", background: "#211d35" }}
    >
      <svg
        viewBox="0 0 1000 840"
        aria-label="Around again, traveling along a changing elliptical baseline"
        style={{ position: "absolute", inset: "5%", width: "90%", height: "90%" }}
      >
        {phrase.map((letter, i) => (
          <g key={i} data-orbit-letter="">
            <text
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily={FONT.sans}
              fontWeight="800"
              fontSize="58"
              fill={i < phrase.length / 2 ? "#e9dbff" : "#fbaa79"}
            >
              {letter}
            </text>
          </g>
        ))}
      </svg>
    </Timegroup>
  );
}
