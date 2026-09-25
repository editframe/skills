import { type Aspect } from "../src/primitives";
import { SpatialStudy } from "./shared/SpatialStudy";
export const duration = 6;
export const posterTime = 3.5;
export const aspect = "landscape" as const;
const POINTS = Array.from({ length: 6 }, (_, i) => [
  300 + 220 * Math.cos((i * Math.PI) / 3),
  300 + 220 * Math.sin((i * Math.PI) / 3),
]);
function Hexagon() {
  return (
    <svg viewBox="0 0 600 600" style={{ width: "100%", height: "100%" }}>
      <polygon
        points={POINTS.map((p) => p.join(",")).join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
      />
      {POINTS.map((p, i) => (
        <g key={i}>
          <path d={`M300 300 L${p[0]} ${p[1]}`} stroke="currentColor" strokeWidth="2" />
          <circle cx={p[0]} cy={p[1]} r="8" fill="currentColor" />
        </g>
      ))}
    </svg>
  );
}
// Intent: reveal depth without losing the original silhouette; calm, wire, moderate.
export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  return (
    <SpatialStudy id={id} aspect={frame} duration={duration} background="#222b35" color="#b8ccd9">
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          perspective: "160cqmin",
        }}
      >
        <div
          style={{
            width: "67cqmin",
            height: "67cqmin",
            transformStyle: "preserve-3d",
            animation: "study-hex-turn 6s linear both",
          }}
        >
          {[-1, 0, 1].map((n) => (
            <div
              key={n}
              style={{
                position: "absolute",
                inset: 0,
                color: n === 0 ? "#e6a47c" : "#b8ccd9",
                opacity: n === 0 ? 1 : 0.65,
                animation: `study-hex-plane-${n + 1} 6s linear both`,
              }}
            >
              <Hexagon />
            </div>
          ))}
        </div>
      </div>
      <style>{`@keyframes study-hex-turn {0%,16%{transform:rotateX(0) rotateY(0);animation-timing-function:cubic-bezier(.45,0,.2,1)}43%,76%{transform:rotateX(22deg) rotateY(56deg);animation-timing-function:cubic-bezier(.5,0,.3,1)}94%,100%{transform:rotateX(0) rotateY(0)}} ${[-1, 0, 1].map((n) => `@keyframes study-hex-plane-${n + 1}{0%,${23 + (n + 1) * 2}%{transform:translateZ(0);animation-timing-function:cubic-bezier(.3,0,.2,1)}${47 + (n + 1) * 2}%,66%{transform:translateZ(${n * 10}cqmin);animation-timing-function:cubic-bezier(.5,0,.3,1)}82%,100%{transform:translateZ(0)}}`).join(" ")}`}</style>
    </SpatialStudy>
  );
}
