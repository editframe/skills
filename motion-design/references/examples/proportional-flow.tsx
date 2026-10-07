import { GeometryStage, type StudyProps } from "./shared/geometry-studies";
import { FONT } from "../src/primitives";

export const duration = 7;
export const posterTime = 3.8;
export const aspect = "landscape" as const;
const bands = [
  { value: 20, from: 242, to: 132, size: 80, color: "#e8a47a" },
  { value: 25, from: 322, to: 322, size: 100, color: "#b9cba3" },
  { value: 15, from: 422, to: 512, size: 60, color: "#a7a5db" },
];

export function Video({ id, aspect: frame = aspect }: StudyProps) {
  const clip = `flow-${id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const tall = frame === "portrait";
  return (
    <GeometryStage id={id} aspect={frame} duration={duration} background="#242d31" ink="#f1eee1">
      <svg
        viewBox={tall ? "0 0 760 1000" : "0 0 1100 720"}
        role="img"
        aria-label="A total of sixty divides into flows of twenty, twenty-five, and fifteen; band widths preserve their proportions"
        style={{ width: "100%", height: "100%" }}
      >
        <defs>
          <clipPath id={clip}>
            <rect
              x="0"
              y="0"
              width="1000"
              height="720"
              style={{
                transformOrigin: "160px 0",
                animation: `proportional-flow-window ${duration}s linear both`,
              }}
            />
          </clipPath>
        </defs>
        <g transform={tall ? "translate(740 20) rotate(90) scale(.88)" : undefined}>
          <g clipPath={`url(#${clip})`}>
            {bands.map(({ from, to, size, color }, i) => (
              <g key={i}>
                <path
                  d={`M160 ${from} H200 C470 ${from} 550 ${to} 820 ${to} H855 V${to + size} H820 C550 ${to + size} 470 ${from + size} 200 ${from + size} H160 Z`}
                  fill={color}
                  opacity=".85"
                />
                <path
                  d={`M180 ${from + size / 2} H200 C470 ${from + size / 2} 550 ${to + size / 2} 840 ${to + size / 2}`}
                  fill="none"
                  stroke="#f6f1dc"
                  strokeWidth="3"
                  pathLength="100"
                  strokeDasharray="2 18"
                  style={{ animation: `proportional-flow-current ${duration}s linear both` }}
                />
              </g>
            ))}
          </g>
          <g fontFamily={FONT.sans} fill="currentColor" fontSize="38">
            <text
              style={{ animation: `proportional-flow-source ${duration}s linear both` }}
              x="102"
              y="374"
              textAnchor="middle"
              transform={tall ? "rotate(-90 102 374)" : undefined}
            >
              60
            </text>
            {bands.map(({ to, size, value }) => (
              <text
                key={value}
                style={{ animation: `proportional-flow-label ${duration}s linear both` }}
                x="920"
                y={to + size / 2 + 13}
                textAnchor="middle"
                transform={tall ? `rotate(-90 920 ${to + size / 2 + 13})` : undefined}
              >
                {value}
              </text>
            ))}
          </g>
        </g>
      </svg>
      <style>{`
      @keyframes proportional-flow-window{0%,8%{transform:scaleX(0);animation-timing-function:cubic-bezier(.6,0,.25,1)}40%,77%{transform:scaleX(1);animation-timing-function:cubic-bezier(.5,0,.6,1)}96%,100%{transform:scaleX(0)}}
      @keyframes proportional-flow-current{0%{stroke-dashoffset:0;stroke-opacity:0}40%{stroke-opacity:.9}75%{stroke-opacity:.9}100%{stroke-dashoffset:-140;stroke-opacity:0}}
      @keyframes proportional-flow-source{0%,100%{opacity:.4}8%,88%{opacity:1}}
      @keyframes proportional-flow-label{0%,40%{opacity:0}48%,70%{opacity:1}77%,100%{opacity:0}}
    `}</style>
    </GeometryStage>
  );
}
