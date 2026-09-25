import { Solo, FONT, type Aspect } from "../src/primitives";

export const duration = 7.8;
export const posterTime = 3;
export const aspect = "landscape" as const;

/** A quiet identification layer reads independently of the moving image beneath it. */
export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  const tall = frame === "portrait";
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          background: "#123a3a",
          fontFamily: FONT.sans,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at 72% 28%, #3f7770 0%, transparent 62%), linear-gradient(160deg, #1e4b49, #0b2429)",
          }}
        />
        <svg
          viewBox="0 0 1000 1000"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
          style={{ position: "absolute", width: "100%", height: "100%" }}
        >
          <defs>
            <linearGradient id={`${id}-ribbon`} x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#efa671" />
              <stop offset=".46" stopColor="#cd6b4f" />
              <stop offset="1" stopColor="#753d42" />
            </linearGradient>
            <radialGradient id={`${id}-sun`} cx="35%" cy="28%">
              <stop stopColor="#ffe5b8" />
              <stop offset=".65" stopColor="#e6a46e" />
              <stop offset="1" stopColor="#ae594d" />
            </radialGradient>
          </defs>
          <g
            style={{
              transformOrigin: "680px 360px",
              animation: "lower-anchor-orbit 7.8s ease-in-out both",
            }}
          >
            <circle cx="680" cy="360" r="205" fill={`url(#${id}-sun)`} />
            {Array.from({ length: 26 }, (_, i) => (
              <path
                key={i}
                d={`M ${365 + i * 9} 130 C ${840 + i * 6} ${180 + i * 3}, ${305 + i * 6} ${490 + i * 6}, ${930 + i * 7} ${610 + i * 4}`}
                fill="none"
                stroke={`url(#${id}-ribbon)`}
                strokeWidth="11"
                strokeLinecap="round"
                opacity={0.6 + i * 0.015}
              />
            ))}
          </g>
          {Array.from({ length: 9 }, (_, i) => (
            <path
              key={i}
              d={`M -120 ${410 + i * 32} C 260 ${180 + i * 33}, 200 ${870 + i * 16}, 1120 ${660 + i * 35}`}
              fill="none"
              stroke="#92b1a0"
              strokeWidth="1.2"
              opacity=".14"
            />
          ))}
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(0deg, rgba(5,24,28,.52), transparent 48%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "7%",
            bottom: "10%",
            width: tall ? "79%" : frame === "square" ? "69%" : "43%",
            padding: tall ? "42px 42px 40px" : "32px 42px 34px",
            background: "#f2f0e7",
            color: "#173532",
            borderLeft: "7px solid #dd8563",
            animation: "lower-anchor-plate 7.8s linear both",
          }}
        >
          <div style={{ overflow: "hidden" }}>
            <div
              style={{
                fontSize: tall ? 64 : 56,
                fontWeight: 650,
                letterSpacing: "-.035em",
                lineHeight: 1.12,
                animation: "lower-anchor-name 7.8s linear both",
              }}
            >
              Noa Mercer
            </div>
          </div>
          <div style={{ overflow: "hidden", marginTop: 12 }}>
            <div
              style={{
                fontSize: tall ? 28 : 25,
                letterSpacing: ".015em",
                color: "#50716b",
                animation: "lower-anchor-role 7.8s linear both",
              }}
            >
              Material artist
            </div>
          </div>
        </div>
        <style>{`
        @keyframes lower-anchor-orbit {0%,100%{transform:translate(12px, 0) rotate(-8deg)}50%{transform:translate(-25px, 24px) rotate(8deg)}}
        @keyframes lower-anchor-plate {
          0%,10%{clip-path:inset(0 100% 0 0);transform:translateX(-14px);animation-timing-function:cubic-bezier(.2,.7,.2,1)}
          21%,79%{clip-path:inset(0 0 0 0);transform:translateX(0);animation-timing-function:cubic-bezier(.65,0,.85,.4)}
          91%,100%{clip-path:inset(0 0 0 100%);transform:translateX(18px)}
        }
        @keyframes lower-anchor-name {0%,15%{transform:translateY(112%);animation-timing-function:cubic-bezier(.16,1,.3,1)}25%,100%{transform:translateY(0)}}
        @keyframes lower-anchor-role {0%,19%{transform:translateY(112%);animation-timing-function:cubic-bezier(.16,1,.3,1)}29%,100%{transform:translateY(0)}}
      `}</style>
      </div>
    </Solo>
  );
}
