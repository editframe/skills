import { Solo, FONT, type Aspect } from "../src/primitives";

export const duration = 8.4;
export const posterTime = 4.9;
export const aspect = "landscape" as const;

/** One boundary reallocates the frame, while the picture and its information retain identity. */
export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  const stacked = frame !== "landscape";
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          gridTemplateColumns: stacked ? "1fr" : "62fr 38fr",
          gridTemplateRows: stacked ? "62fr 38fr" : "1fr",
          overflow: "hidden",
          fontFamily: FONT.sans,
          animation: `split-handoff-${stacked ? "rows" : "columns"} ${duration}s linear both`,
        }}
      >
        <div
          style={{
            position: "relative",
            minWidth: 0,
            minHeight: 0,
            overflow: "hidden",
            background: "#df593e",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "radial-gradient(ellipse at 50% 35%, #f78c58, transparent 70%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              viewBox="0 0 600 600"
              aria-label="An amber glass form"
              style={{ width: "90%", height: "90%", overflow: "visible" }}
            >
              <defs>
                <linearGradient id={`${id}-glass`} x1="0" y1="0" x2=".8" y2="1">
                  <stop stopColor="#ffecb5" />
                  <stop offset=".3" stopColor="#fcaa64" />
                  <stop offset=".66" stopColor="#9e392c" />
                  <stop offset="1" stopColor="#e8b96d" />
                </linearGradient>
              </defs>
              <ellipse cx="300" cy="491" rx="147" ry="20" fill="#752e25" opacity=".2" />
              <g
                style={{
                  transformOrigin: "300px 300px",
                  animation: "split-handoff-sculpture 8.4s ease-in-out both",
                }}
              >
                {Array.from({ length: 27 }, (_, i) => {
                  const t = i / 26;
                  const radius = 88 + Math.sin(t * Math.PI) * 90;
                  return (
                    <ellipse
                      key={i}
                      cx={300 + Math.sin(t * Math.PI * 2) * 24}
                      cy={147 + t * 300}
                      rx={radius}
                      ry={41 + Math.sin(t * Math.PI) * 16}
                      fill={`url(#${id}-glass)`}
                      stroke="#f7bd7d"
                      strokeWidth="1.5"
                    />
                  );
                })}
                <ellipse cx="300" cy="147" rx="88" ry="41" fill="#f5c985" />
                <ellipse cx="300" cy="147" rx="59" ry="24" fill="#743b2d" />
                <ellipse cx="300" cy="151" rx="56" ry="19" fill="#a96a42" />
              </g>
            </svg>
          </div>
          <div
            style={{
              position: "absolute",
              left: 44,
              bottom: 38,
              fontFamily: FONT.mono,
              fontSize: 22,
              color: "#722f25",
            }}
          >
            01 / 03
          </div>
        </div>
        <div
          style={{
            position: "relative",
            minWidth: 0,
            minHeight: 0,
            padding: stacked ? "7% 8%" : "12% 10%",
            background: "#f3ecd8",
            color: "#392e26",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            borderLeft: stacked ? "none" : "2px solid #392e26",
            borderTop: stacked ? "2px solid #392e26" : "none",
          }}
        >
          <div
            style={{
              fontSize: stacked ? 82 : 94,
              fontWeight: 580,
              letterSpacing: "-.055em",
              lineHeight: 0.95,
            }}
          >
            Tidal
          </div>
          <div style={{ marginTop: 22, fontSize: 28, color: "#7b6d5a" }}>Cast glass</div>
          <div
            style={{
              maxWidth: 470,
              marginTop: stacked ? 36 : 64,
              overflow: "hidden",
              animation: "split-handoff-detail 8.4s linear both",
            }}
          >
            <div
              style={{
                height: 2,
                background: "#c5b69a",
                transformOrigin: "left",
                animation: "split-handoff-rule 8.4s linear both",
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginTop: 28,
                fontFamily: FONT.mono,
              }}
            >
              <span style={{ fontSize: 22 }}>Diameter</span>
              <span style={{ fontSize: 38 }}>
                24 <span style={{ fontSize: 21 }}>cm</span>
              </span>
            </div>
          </div>
        </div>
        <style>{`
        @keyframes split-handoff-columns {0%,28%{grid-template-columns:62fr 38fr;animation-timing-function:cubic-bezier(.72,0,.2,1)}49%,77%{grid-template-columns:39fr 61fr;animation-timing-function:cubic-bezier(.72,0,.2,1)}97%,100%{grid-template-columns:62fr 38fr}}
        @keyframes split-handoff-rows {0%,28%{grid-template-rows:62fr 38fr;animation-timing-function:cubic-bezier(.72,0,.2,1)}49%,77%{grid-template-rows:42fr 58fr;animation-timing-function:cubic-bezier(.72,0,.2,1)}97%,100%{grid-template-rows:62fr 38fr}}
        @keyframes split-handoff-sculpture {0%,28%{transform:rotate(-6deg)}49%,77%{transform:rotate(7deg)}97%,100%{transform:rotate(-6deg)}}
        @keyframes split-handoff-detail {0%,36%{opacity:0;transform:translateY(15px);animation-timing-function:cubic-bezier(.2,.7,.2,1)}50%,73%{opacity:1;transform:translateY(0)}81%,100%{opacity:0;transform:translateY(8px)}}
        @keyframes split-handoff-rule {0%,36%{transform:scaleX(0);animation-timing-function:cubic-bezier(.2,.7,.2,1)}54%,100%{transform:scaleX(1)}}
      `}</style>
      </div>
    </Solo>
  );
}
