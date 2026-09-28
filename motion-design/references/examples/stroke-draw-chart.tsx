import { type Aspect } from "../src/primitives";
import { SpatialStudy } from "./shared/SpatialStudy";
export const duration = 6;
export const posterTime = 3.5;
export const aspect = "landscape" as const;
// Intent: reveal a trend before its conclusion; clear, ink, subtle. Data are illustrative.
export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  return (
    <SpatialStudy id={id} aspect={frame} duration={duration} background="#ebe7dc" color="#393d34">
      <div
        style={{
          position: "absolute",
          inset: "22% 9%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: "4cqmin",
        }}
      >
        <svg
          viewBox="0 0 900 400"
          style={{ width: "100%", maxHeight: "43cqmin", overflow: "visible" }}
        >
          {[60, 150, 240, 330].map((y) => (
            <path key={y} d={`M0 ${y}H900`} stroke="#c4c4b5" strokeWidth="1" />
          ))}
          <path
            d="M0 320 C80 320 90 260 180 265 S310 325 360 210 S460 250 540 155 S640 230 720 105 S830 125 890 42"
            fill="none"
            stroke="#606d4e"
            strokeWidth="7"
            strokeLinecap="round"
            pathLength="1"
            strokeDasharray="1"
            style={{ animation: "study-chart-line 6s linear both" }}
          />
          <g style={{ animation: "study-chart-label 6s linear both" }}>
            <circle cx="890" cy="42" r="10" fill="#606d4e" />
            <text x="880" y="5" textAnchor="end" fontSize="25" fill="#393d34">
              96
            </text>
          </g>
          {["01", "02", "03", "04", "05", "06"].map((s, i) => (
            <text key={s} x={i * 174} y="385" fontSize="18" fill="#6c7063" fontFamily="monospace">
              {s}
            </text>
          ))}
        </svg>
      </div>
      <style>{`@keyframes study-chart-line{0%,7%{stroke-dashoffset:1;opacity:1;animation-timing-function:cubic-bezier(.3,.15,.3,1)}46%,82%{stroke-dashoffset:0;opacity:1}94%,100%{stroke-dashoffset:0;opacity:0}} @keyframes study-chart-label{0%,46%{opacity:0;transform:translateY(7px);animation-timing-function:cubic-bezier(.2,.7,.2,1)}55%,78%{opacity:1;transform:translateY(0)}88%,100%{opacity:0;transform:translateY(0)}}`}</style>
    </SpatialStudy>
  );
}
