import { type Aspect } from "../src/primitives";
import { SpatialStudy } from "./shared/SpatialStudy";
export const duration = 5;
export const aspect = "landscape" as const;
// Intent: compare three relative magnitudes with one shared scale; measured, ink, subtle.
export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  return (
    <SpatialStudy id={id} aspect={frame} duration={duration} background="#323e37" color="#e3e9d4">
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
        <svg
          viewBox="0 0 600 600"
          style={{ width: "65cqmin", height: "65cqmin", overflow: "visible" }}
        >
          {[240, 187, 134].map((r, i) => (
            <g key={r} transform="rotate(-90 300 300)">
              <circle cx="300" cy="300" r={r} fill="none" stroke="#536050" strokeWidth="28" />
              <circle
                cx="300"
                cy="300"
                r={r}
                fill="none"
                stroke={["#d7e4ba", "#b8a8d0", "#e6a476"][i]}
                strokeWidth="28"
                strokeLinecap="round"
                pathLength="1"
                strokeDasharray={`${[0.82, 0.64, 0.43][i]} 1`}
                style={{
                  animation: `study-ring-${i} 1.6s ${0.2 + i * 0.25}s cubic-bezier(.2,.75,.3,1) both`,
                }}
              />
            </g>
          ))}
        </svg>
      </div>
      <style>
        {[0.82, 0.64, 0.43]
          .map(
            (n, i) =>
              `@keyframes study-ring-${i}{from{stroke-dasharray:0 1}to{stroke-dasharray:${n} 1}}`,
          )
          .join(" ")}
      </style>
    </SpatialStudy>
  );
}
