import { Solo, FONT, type Aspect } from "../src/primitives";

export const duration = 8.4;
export const posterTime = 4;
export const aspect = "landscape" as const;

/** The scene gives up space once, before a phrase arrives, then restores it after reading. */
export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  const tall = frame === "portrait";
  const square = frame === "square";
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <div style={{ position: "absolute", inset: 0, background: "#f0e9d8", fontFamily: FONT.sans }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: "100%",
            overflow: "hidden",
            background: "#203f4a",
            animation: "caption-reflow-space 8.4s linear both",
          }}
        >
          <svg
            viewBox={tall ? "160 -230 680 1260" : square ? "0 -100 1000 1000" : "0 0 1000 800"}
            preserveAspectRatio="xMidYMid meet"
            style={{ position: "absolute", width: "100%", height: "100%" }}
            role="img"
            aria-label="Three colored currents converge while the composition moves up to make room for a caption"
          >
            <defs>
              <linearGradient id={`${id}-flow`} x1="0" y1="0" x2="1" y2="0">
                <stop stopColor="#203f4a" stopOpacity="0" />
                <stop offset=".3" stopColor="#203f4a" stopOpacity="0" />
                <stop offset="1" stopColor="#203f4a" stopOpacity=".75" />
              </linearGradient>
            </defs>
            <g style={{ animation: "caption-reflow-drift 8.4s ease-in-out both" }}>
              {["#e69c75", "#b8c796", "#83b4b8"].map((color, i) => (
                <g key={color}>
                  <path
                    d={`M -90 ${130 + i * 275} C 350 ${30 + i * 275}, 230 ${380 + i * 20}, 1080 ${380 + i * 20}`}
                    stroke={color}
                    strokeWidth="76"
                    fill="none"
                    opacity=".18"
                  />
                  {Array.from({ length: 7 }, (_, n) => (
                    <path
                      key={n}
                      d={`M -90 ${98 + i * 275 + n * 10} C 350 ${-2 + i * 275 + n * 10}, 230 ${348 + i * 20 + n * 10}, 1080 ${348 + i * 20 + n * 10}`}
                      stroke={color}
                      strokeWidth="3.5"
                      fill="none"
                    />
                  ))}
                  <path
                    d={`M -90 ${130 + i * 275} C 350 ${30 + i * 275}, 230 ${380 + i * 20}, 1080 ${380 + i * 20}`}
                    pathLength="1"
                    stroke="#f3edd5"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray=".014 .986"
                    fill="none"
                    style={{
                      animation: `caption-reflow-current 8.4s ${-i * 0.32}s linear infinite`,
                    }}
                  />
                </g>
              ))}
              <circle cx="690" cy="400" r="102" fill="#203f4a" stroke="#b8c796" strokeWidth="1" />
              <circle cx="690" cy="400" r="70" fill="#b8c796" />
              <path
                d="M 655 400 H 721 M 702 381 L 721 400 L 702 419"
                stroke="#203f4a"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </g>
          </svg>
        </div>
        <div
          style={{
            position: "absolute",
            left: "8%",
            right: "8%",
            bottom: 0,
            height: "26%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            animation: "caption-reflow-phrase 8.4s linear both",
          }}
        >
          <div
            style={{
              color: "#29474b",
              fontSize: tall ? 54 : square ? 50 : 46,
              fontWeight: 500,
              lineHeight: 1.2,
              letterSpacing: "-.025em",
              maxWidth: tall ? 640 : undefined,
            }}
          >
            Three currents.
            <br style={{ display: tall ? "block" : "none" }} />
            {!tall && " "}One direction.
          </div>
        </div>
        <style>{`
        @keyframes caption-reflow-space {0%,12%{height:100%;animation-timing-function:cubic-bezier(.65,0,.25,1)}28%,76%{height:74%;animation-timing-function:cubic-bezier(.65,0,.25,1)}94%,100%{height:100%}}
        @keyframes caption-reflow-phrase {0%,25%{opacity:0;transform:translateY(12px)}34%,72%{opacity:1;transform:translateY(0)}80%,100%{opacity:0;transform:translateY(0)}}
        @keyframes caption-reflow-drift {0%,100%{transform:translateX(-14px)}50%{transform:translateX(14px)}}
        @keyframes caption-reflow-current {0%{stroke-dashoffset:.08}100%{stroke-dashoffset:-.92}}
      `}</style>
      </div>
    </Solo>
  );
}
