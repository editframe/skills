import { Timegroup } from "@editframe/react";
import type { EFTimegroupElement } from "@editframe/elements";
import { ASPECT, FONT, type Aspect } from "../src/primitives";

export const duration = 8;
export const posterTime = 3.2;
export const aspect = "landscape" as const;

// The motion clock computes one subject transform and its exact projected anchor.
// A fixed label stays readable; the elbow remains outside the subject's silhouette.
function initialize(root: EFTimegroupElement) {
  const svg = root.querySelector<SVGSVGElement>("[data-callout-stage]")!;
  const subject = root.querySelector<SVGGElement>("[data-callout-subject]")!;
  const shadow = root.querySelector<SVGEllipseElement>("[data-callout-shadow]")!;
  const line = root.querySelector<SVGPathElement>("[data-callout-leader]")!;
  const anchor = root.querySelector<SVGGElement>("[data-callout-anchor]")!;
  const [width, height] = svg.getAttribute("viewBox")!.split(" ").slice(2).map(Number);
  const tall = height > width;
  const labelX = width * (tall ? 0.25 : 0.64);
  const labelY = height * (tall ? 0.2 : 0.23);
  root.addFrameTask(({ ownCurrentTime }) => {
    const phase = (ownCurrentTime / duration) * Math.PI * 2;
    const cx = width * 0.39 + Math.sin(phase) * width * 0.065;
    const cy = height * 0.61 + (1 - Math.cos(phase)) * height * 0.023;
    const angle = -12 + Math.sin(phase) * 14;
    const radians = (angle * Math.PI) / 180;
    const ax = cx + 116 * Math.cos(radians) + 42 * Math.sin(radians);
    const ay = cy + 116 * Math.sin(radians) - 42 * Math.cos(radians);
    const elbow = Math.max(ax + 42, labelX - 26);
    subject.setAttribute("transform", `translate(${cx} ${cy}) rotate(${angle})`);
    shadow.setAttribute("cx", String(cx));
    shadow.setAttribute("cy", String(height * 0.87));
    shadow.setAttribute("rx", String(115 - Math.cos(phase) * 8));
    line.setAttribute(
      "d",
      `M ${ax} ${ay} L ${elbow} ${ay - 28} L ${elbow} ${labelY + 79} L ${labelX} ${labelY + 79}`,
    );
    anchor.setAttribute("transform", `translate(${ax} ${ay})`);
  });
}

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  const [width, height] = ASPECT[frame];
  const vw = frame === "landscape" ? 1000 : frame === "portrait" ? 600 : 800;
  const vh = frame === "landscape" ? 562.5 : frame === "portrait" ? 1066.67 : 800;
  const tall = frame === "portrait";
  const labelX = vw * (tall ? 0.25 : 0.64);
  const labelY = vh * (tall ? 0.2 : 0.23);
  return (
    <Timegroup
      id={id}
      mode="fixed"
      duration={`${duration}s`}
      loop
      initializer={initialize}
      style={{ width, height, position: "relative", overflow: "hidden", background: "#e6e6d7" }}
    >
      <svg
        data-callout-stage=""
        viewBox={`0 0 ${vw} ${vh}`}
        style={{ width: "100%", height: "100%", fontFamily: FONT.sans }}
        role="img"
        aria-label="A callout tracks the rim of a moving ceramic vessel while its label remains stationary"
      >
        <defs>
          <linearGradient id={`${id}-clay`} x1="0" y1="0" x2="1" y2=".3">
            <stop stopColor="#254d4c" />
            <stop offset=".44" stopColor="#3d7167" />
            <stop offset=".73" stopColor="#254b48" />
            <stop offset="1" stopColor="#112f35" />
          </linearGradient>
          <radialGradient id={`${id}-floor`}>
            <stop stopColor="#a5b4a1" stopOpacity=".33" />
            <stop offset="1" stopColor="#e6e6d7" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width={vw} height={vh} fill="#e6e6d7" />
        <ellipse
          cx={vw * 0.39}
          cy={vh * 0.75}
          rx={vw * 0.55}
          ry={vh * 0.4}
          fill={`url(#${id}-floor)`}
        />
        <ellipse
          data-callout-shadow=""
          cx={vw * 0.39}
          cy={vh * 0.87}
          rx="108"
          ry="8"
          fill="#50635a"
          opacity=".12"
        />
        <g data-callout-subject="" transform={`translate(${vw * 0.39} ${vh * 0.61}) rotate(-12)`}>
          <path
            d="M -130 -68 C -133 6 -118 110 -75 131 Q 0 168 75 131 C 118 110 133 6 130 -68 Z"
            fill={`url(#${id}-clay)`}
          />
          {Array.from({ length: 17 }, (_, i) => {
            const y = -51 + i * 10;
            const rx = 128 - Math.pow(i / 17, 2) * 42;
            return (
              <path
                key={i}
                d={`M ${-rx} ${y} Q 0 ${y + 65} ${rx} ${y}`}
                stroke={i % 3 === 0 ? "#91aa84" : "#4c7b6a"}
                strokeWidth="1.2"
                opacity=".58"
                fill="none"
              />
            );
          })}
          <ellipse cy="-68" rx="130" ry="52" fill="#769482" />
          <ellipse cy="-68" rx="113" ry="39" fill="#102f33" />
          <path d="M -110 -59 Q 0 -14 110 -59 Q 106 -36 0 -26 Q -106 -36 -110 -59" fill="#29544e" />
          <ellipse cy="-68" rx="130" ry="52" fill="none" stroke="#c0cbb0" strokeWidth="2" />
        </g>
        <path
          data-callout-leader=""
          d="M 0 0"
          pathLength="1"
          fill="none"
          stroke="#426056"
          strokeWidth="1.25"
          strokeLinejoin="round"
          style={{ strokeDasharray: 1, animation: "tracked-callout-leader 8s linear both" }}
        />
        <g data-callout-anchor="" style={{ animation: "tracked-callout-dot 8s linear both" }}>
          <circle r="6" fill="#e6e6d7" />
          <circle r="2.2" fill="#254c43" />
        </g>
        <g
          transform={`translate(${labelX} ${labelY})`}
          fill="#26463e"
          style={{ animation: "tracked-callout-label 8s linear both" }}
        >
          <text fontSize="16" fontFamily={FONT.mono} letterSpacing="1.5">
            RIM / 04
          </text>
          <text y="40" fontSize="32" fontWeight="550" letterSpacing="-1">
            3.2{" "}
            <tspan fontSize="19" letterSpacing="0">
              mm
            </tspan>
          </text>
          <text y="64" fontSize="14" fill="#758376">
            Glazed stoneware
          </text>
        </g>
        <style>{`
        @keyframes tracked-callout-dot {0%,7%{opacity:0}12%,85%{opacity:1}91%,100%{opacity:0}}
        @keyframes tracked-callout-leader {0%,11%{stroke-dashoffset:1;opacity:1;animation-timing-function:cubic-bezier(.33,1,.68,1)}25%,85%{stroke-dashoffset:0;opacity:1}92%,100%{stroke-dashoffset:0;opacity:0}}
        @keyframes tracked-callout-label {0%,19%{opacity:0}28%,85%{opacity:1}91%,100%{opacity:0}}
      `}</style>
      </svg>
    </Timegroup>
  );
}
