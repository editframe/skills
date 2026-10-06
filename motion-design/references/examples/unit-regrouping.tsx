import { GeometryStage, type StudyProps } from "./shared/geometry-studies";
import { FONT } from "../src/primitives";

export const duration = 6.4;
export const posterTime = 3;
export const aspect = "landscape" as const;
const colors = ["#e58353", "#6faaa0", "#aa99c8"];
const counts = [20, 25, 15];

export function Video({ id, aspect: frame = aspect }: StudyProps) {
  const tall = frame === "portrait";
  const width = tall ? 650 : 1000;
  const height = tall ? 1000 : 650;
  const units = counts.flatMap((count, group) =>
    Array.from({ length: count }, (_, i) => ({ group, i })),
  );
  return (
    <GeometryStage id={id} aspect={frame} duration={duration} background="#f0ede4" ink="#292e2c">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Sixty units regroup into three populations of twenty, twenty-five, and fifteen"
        style={{ width: "100%", height: "100%" }}
      >
        {units.map(({ group, i }, index) => {
          // A coprime permutation interleaves populations without random placement.
          const cell = (index * 17) % 60;
          const x0 = width / 2 - 198 + (cell % 10) * 44;
          const y0 = height / 2 - 110 + Math.floor(cell / 10) * 44;
          const x1 = tall ? 150 + (i % 5) * 44 : 160 + group * 280 + (i % 5) * 36;
          const y1 = tall
            ? 150 + group * 260 + Math.floor(i / 5) * 36
            : 432 - Math.floor(i / 5) * 44;
          // Neighboring rows travel as phrases; each population follows the last.
          const departure = 12 + group * 3 + Math.floor(i / 5) * 0.7;
          const arrival = departure + 24;
          return (
            <g key={index} style={{ animation: `unit-regroup-${index} ${duration}s linear both` }}>
              <circle r={tall ? 13 : 14} fill={colors[group]} />
              <style>{`@keyframes unit-regroup-${index}{
            0%,${departure}%{transform:translate(${x0}px,${y0}px);animation-timing-function:cubic-bezier(.6,0,.2,1)}
            ${arrival}%,72%{transform:translate(${x1}px,${y1}px);animation-timing-function:cubic-bezier(.65,0,.35,1)}
            ${94 + group + Math.floor(i / 5) * 0.35}%,100%{transform:translate(${x0}px,${y0}px)}
          }`}</style>
            </g>
          );
        })}
        {counts.map((count, group) => (
          <text
            key={group}
            x={tall ? 440 : 232 + group * 280}
            y={tall ? 225 + group * 260 : 506}
            textAnchor="middle"
            fill="#292e2c"
            fontFamily={FONT.sans}
            fontSize="40"
            fontWeight="500"
            style={{ animation: `unit-regroup-label ${duration}s linear both` }}
          >
            {count}
          </text>
        ))}
      </svg>
      <style>{`@keyframes unit-regroup-label{0%,43%{opacity:0}50%,65%{opacity:1}71%,100%{opacity:0}}`}</style>
    </GeometryStage>
  );
}
