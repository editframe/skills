import { Solo, FONT, type Aspect } from "../src/primitives";

export const duration = 8;
export const posterTime = 3;
export const aspect = "landscape" as const;

function Terrain({ restored }: { restored: boolean }) {
  return (
    <svg
      viewBox="0 0 1000 800"
      preserveAspectRatio="xMidYMid slice"
      style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}
    >
      <rect width="1000" height="800" fill={restored ? "#9cbaa5" : "#d1a281"} />
      {Array.from({ length: 29 }, (_, i) => (
        <path
          key={i}
          d={`M -80 ${-70 + i * 40} C 260 ${170 + i * 14} 360 ${-120 + i * 30} 1100 ${110 + i * 32}`}
          fill="none"
          stroke={restored ? "#648c73" : "#a4755c"}
          strokeWidth="2"
          opacity=".55"
        />
      ))}
      <path
        d="M 335 -80 C 135 145 720 185 585 400 S 150 555 320 890"
        fill="none"
        stroke={restored ? "#c3d9b9" : "#e2c4a4"}
        strokeWidth="165"
      />
      <path
        d="M 335 -80 C 135 145 720 185 585 400 S 150 555 320 890"
        fill="none"
        stroke={restored ? "#3d7d82" : "#a78370"}
        strokeWidth="80"
      />
      <path
        d="M 335 -80 C 135 145 720 185 585 400 S 150 555 320 890"
        fill="none"
        stroke={restored ? "#7bb9b4" : "#c4a28a"}
        strokeWidth="3"
      />
      {[
        [120, 280],
        [700, 110],
        [740, 475],
        [120, 650],
        [590, 680],
        [845, 295],
      ].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${i * 29})`}>
          {restored ? (
            <>
              <ellipse rx="43" ry="62" fill="#315f53" />
              <ellipse cx="-18" cy="-8" rx="31" ry="44" fill="#5b8560" />
              <ellipse cx="11" cy="-23" rx="23" ry="31" fill="#86a677" />
              <path d="M 0 -23 V 47" stroke="#c3d9b9" strokeWidth="2" />
            </>
          ) : (
            <>
              <path d="M -40 -24 L 32 -32 L 46 27 L -28 42 Z" fill="#bc8a6b" />
              <path d="M -20 11 L 20 -9 M 4 -18 L 8 22" stroke="#e7b799" strokeWidth="2" />
            </>
          )}
        </g>
      ))}
      <path
        d="M -20 455 L 260 352 L 605 355 L 1020 600"
        fill="none"
        stroke={restored ? "#e1dbb9" : "#dec0a1"}
        strokeWidth="15"
      />
      <path d="M 412 350 L 581 351" stroke="#394d46" strokeWidth="23" />
      <path d="M 412 350 L 581 351" stroke="#e9debc" strokeWidth="15" />
    </svg>
  );
}

/** One fixed registration makes the moving boundary a comparison, rather than a cut. */
export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <div style={{ position: "absolute", inset: 0, background: "#eeeadd", fontFamily: FONT.mono }}>
        <div
          style={{
            position: "absolute",
            left: "7%",
            right: "7%",
            top: frame === "portrait" ? "16%" : "11%",
            bottom: frame === "portrait" ? "16%" : "11%",
            overflow: "hidden",
          }}
        >
          <Terrain restored={false} />
          <div
            style={{
              position: "absolute",
              inset: 0,
              animation: "comparison-scan-reveal 8s linear both",
            }}
          >
            <Terrain restored />
          </div>
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              width: "100%",
              animation: "comparison-scan-edge 8s linear both",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                width: 3,
                background: "#fcf5df",
                boxShadow: "0 0 20px #122d2920",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "50%",
                width: 50,
                height: 72,
                marginTop: -36,
                marginLeft: -24,
                borderRadius: 28,
                background: "#fcf5df",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
              }}
            >
              <i style={{ width: 2, height: 20, background: "#426657" }} />
              <i style={{ width: 2, height: 20, background: "#426657" }} />
            </div>
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            left: "7%",
            right: "7%",
            bottom: frame === "portrait" ? "11%" : "5%",
            display: "flex",
            justifyContent: "space-between",
            color: "#526557",
            fontSize: 24,
            letterSpacing: ".12em",
          }}
        >
          <span>REWILD</span>
          <span>01 / 02</span>
        </div>
        <style>{`
        @keyframes comparison-scan-reveal {0%,13%{clip-path:inset(0 88% 0 0);animation-timing-function:cubic-bezier(.5,0,.25,1)}46%,64%{clip-path:inset(0 14% 0 0);animation-timing-function:cubic-bezier(.5,0,.25,1)}93%,100%{clip-path:inset(0 88% 0 0)}}
        @keyframes comparison-scan-edge {0%,13%{transform:translateX(12%);animation-timing-function:cubic-bezier(.5,0,.25,1)}46%,64%{transform:translateX(86%);animation-timing-function:cubic-bezier(.5,0,.25,1)}93%,100%{transform:translateX(12%)}}
      `}</style>
      </div>
    </Solo>
  );
}
