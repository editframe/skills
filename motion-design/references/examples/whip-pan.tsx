import { type Aspect } from "../src/primitives";
import { SpatialStudy } from "./shared/SpatialStudy";
export const duration = 5;
export const posterTime = 2.4;
export const aspect = "landscape" as const;

// Two held compositions, joined by a short camera impulse. The focal centers register.
export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  return (
    <SpatialStudy id={id} aspect={frame} duration={duration} background="#dedccc" color="#222e28">
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        <div
          style={{
            display: "flex",
            width: "200%",
            height: "100%",
            animation: "study-whip-travel 5s linear both",
          }}
        >
          {[0, 1].map((i) => (
            <div
              key={i}
              style={{
                position: "relative",
                width: "50%",
                height: "100%",
                overflow: "hidden",
                background: i ? "#b8bedf" : "#dedccc",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  animation: "study-whip-smear 5s linear both",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    width: 600,
                    height: 600,
                    transform: "translate(-50%,-50%)",
                  }}
                >
                  <svg
                    viewBox="0 0 600 600"
                    width="100%"
                    height="100%"
                    aria-label={
                      i
                        ? "A violet square suspended between parallel rails"
                        : "An orange disc above a striped horizon"
                    }
                  >
                    {i ? (
                      <>
                        {[90, 125, 475, 510].map((x) => (
                          <path key={x} d={`M${x} 0V600`} stroke="#7c79a8" strokeWidth="3" />
                        ))}
                        <path
                          d="M160 160H440V440H160Z"
                          transform="rotate(-12 300 300)"
                          fill="#514774"
                        />
                        <path
                          d="M242 242H358V358H242Z"
                          transform="rotate(-12 300 300)"
                          fill="#dadbc8"
                        />
                      </>
                    ) : (
                      <>
                        {[405, 435, 465, 495, 525].map((y) => (
                          <path key={y} d={`M40 ${y}H560`} stroke="#a7ab8e" strokeWidth="3" />
                        ))}
                        <circle cx="300" cy="300" r="180" fill="#e1663c" />
                        <circle cx="300" cy="300" r="74" fill="#dedccc" />
                      </>
                    )}
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <style>{`
   @keyframes study-whip-travel {
    0%,22%{transform:translateX(0);animation-timing-function:cubic-bezier(.72,0,.18,1)}
    34%,68%{transform:translateX(-50%);animation-timing-function:cubic-bezier(.72,0,.18,1)}
    80%,100%{transform:translateX(0)}
   }
   @keyframes study-whip-smear {
    0%,22%,34%,68%,80%,100%{filter:blur(0)}
    27%,73%{filter:blur(13px)}
   }
  `}</style>
    </SpatialStudy>
  );
}
