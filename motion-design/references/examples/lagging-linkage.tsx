import { Timegroup } from "@editframe/react";
import type { EFTimegroupElement } from "@editframe/elements";
import { ASPECT, type Aspect } from "../src/primitives";

export const duration = 7.8;
export const posterTime = 1.85;
export const aspect = "square" as const;
const lengths = [112, 104, 96, 88, 80];
const palette = ["#eee6cc", "#dfd399", "#cabb72", "#9fa974", "#6e9480"];
const poses = [
  [0, -0.94],
  [0.7, -0.94],
  [1.65, -0.18],
  [2.12, -0.34],
  [2.6, -0.3],
  [3.15, -0.3],
  [4.05, -1.44],
  [4.55, -1.24],
  [4.95, -1.29],
  [5.5, -1.29],
  [6.5, -0.94],
  [7.8, -0.94],
];
function heading(t: number) {
  const i = poses.findIndex((pose) => pose[0] > t);
  if (i <= 0) return poses[i === 0 ? 0 : poses.length - 1][1];
  const [start, a] = poses[i - 1],
    [end, b] = poses[i];
  const progress = (t - start) / (end - start),
    ease = progress * progress * (3 - 2 * progress);
  return a + (b - a) * ease;
}
export function linkageFrame(t: number) {
  const points = [{ x: 250, y: 700 }];
  lengths.forEach((length, i) => {
    const angle = heading(t - i * 0.145),
      previous = points[i];
    points.push({
      x: previous.x + Math.cos(angle) * length,
      y: previous.y + Math.sin(angle) * length,
    });
  });
  return points;
}

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  const [width, height] = ASPECT[frame],
    initial = linkageFrame(0);
  const initialize = (root: EFTimegroupElement) => {
    const links = Array.from(root.querySelectorAll<SVGLineElement>("[data-linkage-link]"));
    const joints = Array.from(root.querySelectorAll<SVGGElement>("[data-linkage-joint]"));
    const draw = (t: number) => {
      const points = linkageFrame(t);
      links.forEach((link, i) => {
        link.setAttribute("x1", String(points[i].x));
        link.setAttribute("y1", String(points[i].y));
        link.setAttribute("x2", String(points[i + 1].x));
        link.setAttribute("y2", String(points[i + 1].y));
      });
      joints.forEach((joint, i) =>
        joint.setAttribute("transform", `translate(${points[i].x} ${points[i].y})`),
      );
    };
    draw(0);
    root.addFrameTask(({ ownCurrentTime }) => draw(ownCurrentTime));
  };
  return (
    <Timegroup
      id={id}
      mode="fixed"
      duration={`${duration}s`}
      loop
      initializer={initialize}
      style={{ position: "relative", width, height, background: "#243837", overflow: "hidden" }}
    >
      <svg
        viewBox="0 0 1000 1000"
        role="img"
        aria-label="A five-link articulated arm propagates a leading gesture through delayed, continuously connected joints"
        style={{ position: "absolute", inset: "5%", width: "90%", height: "90%" }}
      >
        <circle cx="250" cy="700" r="49" fill="none" stroke="#59716a" strokeWidth="2" />
        <path
          d="M201 700 H183 M250 749 V767 M250 651 V633 M299 700 H317"
          stroke="#59716a"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {lengths.map((_, i) => (
          <line
            key={i}
            data-linkage-link=""
            x1={initial[i].x}
            y1={initial[i].y}
            x2={initial[i + 1].x}
            y2={initial[i + 1].y}
            stroke={palette[i]}
            strokeWidth={33 - i * 2.5}
            strokeLinecap="round"
          />
        ))}
        {initial.map((point, i) => (
          <g key={i} data-linkage-joint="" transform={`translate(${point.x} ${point.y})`}>
            <circle
              r={i === 0 ? 31 : i === 5 ? 25 : 20 - i * 0.7}
              fill={i === 5 ? "#e89971" : palette[Math.max(0, i - 1)]}
            />
            <circle r={i === 0 ? 11 : i === 5 ? 8 : 6.5} fill="#243837" />
          </g>
        ))}
      </svg>
    </Timegroup>
  );
}
