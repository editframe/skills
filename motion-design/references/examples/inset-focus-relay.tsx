import { Solo, FONT, type Aspect } from "../src/primitives";

export const duration = 8.8;
export const posterTime = 5.4;
export const aspect = "landscape" as const;

/** The overview stays in place while a second viewport relays between two details. */
export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  const tall = frame === "portrait";
  const square = frame === "square";
  const w = tall ? 600 : 1000;
  const h = tall ? 1066.67 : square ? 1000 : 562.5;
  const size = tall ? 490 : square ? 660 : 490;
  const x = tall ? 55 : square ? 65 : 60;
  const y = tall ? 75 : square ? 70 : 36;
  const detail = tall ? 285 : square ? 290 : 270;
  const dx = tall ? 255 : square ? 645 : 670;
  const dy = tall ? 680 : square ? 650 : 150;
  const scale = size / 600;
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          background: "#ece8db",
          fontFamily: FONT.mono,
        }}
        role="img"
        aria-label="A full topographic drawing stays visible while an inset magnifies two different intersections"
      >
        <defs>
          <g id={`${id}-terrain`}>
            <rect width="600" height="600" fill="#1d4846" />
            {Array.from({ length: 34 }, (_, i) => (
              <path
                key={i}
                d={`M ${-210 + i * 26} -30 C ${480 + i * 7} ${120 + i * 4}, ${-250 + i * 27} ${350 + i * 4}, ${290 + i * 23} 660`}
                fill="none"
                stroke={i % 5 === 0 ? "#bad4ad" : "#6c9c85"}
                strokeWidth={i % 5 === 0 ? 2 : 1}
                opacity=".75"
              />
            ))}
            <path
              d="M -40 380 Q 150 380 260 220 T 650 280"
              fill="none"
              stroke="#d9d6b4"
              strokeWidth="26"
            />
            <path
              d="M -40 380 Q 150 380 260 220 T 650 280"
              fill="none"
              stroke="#e59065"
              strokeWidth="18"
            />
            <path
              d="M 210 660 C 160 480 450 465 420 390 S 350 120 560 -40"
              fill="none"
              stroke="#d9d6b4"
              strokeWidth="8"
            />
            {[
              [260, 220],
              [420, 390],
            ].map(([cx, cy], i) => (
              <g key={i}>
                <circle cx={cx} cy={cy} r="17" fill="#ece8db" />
                <circle cx={cx} cy={cy} r="8" fill="#d7724e" />
                <circle cx={cx} cy={cy} r="3" fill="#173d3d" />
              </g>
            ))}
          </g>
        </defs>
        <svg x={x} y={y} width={size} height={size} viewBox="0 0 600 600">
          <use href={`#${id}-terrain`} />
        </svg>
        <g transform={`translate(${x} ${y}) scale(${scale})`}>
          <g style={{ animation: "inset-relay-target 8.8s linear both" }}>
            <rect
              x="-46"
              y="-46"
              width="92"
              height="92"
              fill="none"
              stroke="#fff4d6"
              strokeWidth="3"
            />
            <path
              d="M -57 0 H -43 M 43 0 H 57 M 0 -57 V -43 M 0 43 V 57"
              stroke="#fff4d6"
              strokeWidth="2"
            />
          </g>
        </g>
        <g style={{ animation: "inset-relay-appear 8.8s linear both" }}>
          <rect x={dx - 6} y={dy - 6} width={detail + 12} height={detail + 12} fill="#f9f4e8" />
          <svg x={dx} y={dy} width={detail} height={detail} viewBox="0 0 220 220" overflow="hidden">
            <g style={{ animation: "inset-relay-detail 8.8s linear both" }}>
              <use href={`#${id}-terrain`} />
            </g>
            <path
              d="M 100 110 H 120 M 110 100 V 120"
              stroke="#fff4d6"
              strokeWidth=".7"
              opacity=".7"
            />
          </svg>
          <text x={dx} y={dy + detail + 29} fontSize="13" letterSpacing="1.5" fill="#42605a">
            {(((detail / 220) * 2.4) / scale).toFixed(1)}×
          </text>
          <path
            d={`M ${dx + detail - 42} ${dy + detail + 22} h 42`}
            stroke="#42605a"
            strokeWidth="1.5"
          />
        </g>
        <style>{`
        @keyframes inset-relay-target {0%,9%{opacity:0;transform:translate(260px,220px)}16%,42%{opacity:1;transform:translate(260px,220px);animation-timing-function:cubic-bezier(.65,0,.25,1)}56%,84%{opacity:1;transform:translate(420px,390px)}93%,100%{opacity:0;transform:translate(420px,390px)}}
        @keyframes inset-relay-detail {0%,42%{transform:translate(-514px,-418px) scale(2.4);animation-timing-function:cubic-bezier(.65,0,.25,1)}56%,100%{transform:translate(-898px,-826px) scale(2.4)}}
        @keyframes inset-relay-appear {0%,12%{opacity:0}21%,84%{opacity:1}93%,100%{opacity:0}}
      `}</style>
      </svg>
    </Solo>
  );
}
