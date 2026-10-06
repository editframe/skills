import { GeometryStage, type StudyProps } from "./shared/geometry-studies";
import { FONT } from "../src/primitives";

export const duration = 7;
export const posterTime = 4.2;
export const aspect = "landscape" as const;
const slices = 26;
const waves = Array.from({ length: slices }, (_, i) => {
  const wave = Math.sin((i / (slices - 1)) * Math.PI * 2);
  const travel = 115 + wave * 90;
  const lag = i * 0.16;
  return `@keyframes current-slice-${i} {
    0%,16% { transform:translate(-55px,-42px); animation-timing-function:ease-in-out; }
    22% { transform:translate(-68px,-42px); animation-timing-function:cubic-bezier(.65,0,.3,1); }
    ${38 + lag}% { transform:translate(${travel}px,${wave * 22}px); animation-timing-function:cubic-bezier(.18,.65,.25,1); }
    ${53 + lag}%,70% { transform:translate(55px,42px); animation-timing-function:cubic-bezier(.65,0,.35,1); }
    ${80 + lag}% { transform:translate(${-travel}px,${wave * -16}px); animation-timing-function:cubic-bezier(.2,.7,.3,1); }
    96%,100% { transform:translate(-55px,-42px); }
  }`;
}).join("\n");

export function Video({ id, aspect: frame = aspect }: StudyProps) {
  const prefix = `current-${id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <GeometryStage id={id} aspect={frame} duration={duration} background="#e8e9de" ink="#153f39">
      <svg
        viewBox="0 0 1100 760"
        aria-label="Drift, sliced into a traveling current and reconstructed"
        style={{
          position: "absolute",
          inset: "5%",
          width: "90%",
          height: "90%",
          overflow: "visible",
        }}
      >
        <defs>
          {Array.from({ length: slices }, (_, i) => (
            <clipPath id={`${prefix}-${i}`} key={i}>
              <rect x="0" y={252 + i * 8} width="1100" height="8.2" />
            </clipPath>
          ))}
        </defs>
        {Array.from({ length: slices }, (_, i) => (
          <g key={i} style={{ animation: `current-slice-${i} ${duration}s linear both` }}>
            <g clipPath={`url(#${prefix}-${i})`}>
              <text
                x="550"
                y="444"
                textAnchor="middle"
                fontFamily={FONT.sans}
                fontWeight="900"
                fontSize="232"
                letterSpacing="-13"
                fill={i > 16 ? "#257564" : "#153f39"}
              >
                DRIFT
              </text>
            </g>
          </g>
        ))}
      </svg>
      <style>{waves}</style>
    </GeometryStage>
  );
}
