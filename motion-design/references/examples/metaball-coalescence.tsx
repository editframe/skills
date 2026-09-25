import { GeometryStage, Artboard, type StudyProps } from "./shared/geometry-studies";

export const duration = 8;
export const posterTime = 2.7;
export const aspect = "square" as const;

// Three drops become one connected contour, rest, and separate again.
// Blur + alpha threshold forms a real neck between nearby contours.
export function Video({ id, aspect: frame = aspect }: StudyProps) {
  const filterId = `coalescence-${id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  return (
    <GeometryStage id={id} aspect={frame} duration={duration} background="#142e37" ink="#f5aa68">
      <Artboard aspect={frame} size={800}>
        <svg
          viewBox="0 0 800 800"
          width="100%"
          height="100%"
          aria-label="Three amber liquid drops merge, rest, and pull apart"
        >
          <defs>
            <filter
              id={filterId}
              x="0"
              y="0"
              width="800"
              height="800"
              filterUnits="userSpaceOnUse"
              colorInterpolationFilters="sRGB"
            >
              <feGaussianBlur in="SourceGraphic" stdDeviation="15" result="soft" />
              <feColorMatrix
                in="soft"
                mode="matrix"
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -10"
              />
            </filter>
          </defs>
          <circle
            cx="400"
            cy="400"
            r="329"
            stroke="#b5cec9"
            strokeOpacity=".16"
            strokeWidth="1"
            fill="none"
          />
          {[0, 1, 2, 3].map((i) => (
            <path
              key={i}
              d="M400 59V73"
              stroke="#b5cec9"
              strokeOpacity=".6"
              strokeWidth="2"
              transform={`rotate(${i * 90} 400 400)`}
            />
          ))}
          <g filter={`url(#${filterId})`} fill="#f5aa68">
            <ellipse rx="113" ry="113" style={{ animation: "coalescence-left 8s both" }} />
            <ellipse rx="113" ry="113" style={{ animation: "coalescence-right 8s both" }} />
            <ellipse rx="86" ry="86" style={{ animation: "coalescence-drop 8s both" }} />
          </g>
        </svg>
      </Artboard>
      <style>{`
      @keyframes coalescence-left {
        0%,7% {transform:translate(207px,335px);animation-timing-function:cubic-bezier(.45,0,.65,.2)}
        14% {transform:translate(194px,335px) scale(.97,1.03);animation-timing-function:cubic-bezier(.2,.7,.2,1)}
        33% {transform:translate(325px,380px) scale(1.12,.94);animation-timing-function:ease-in-out}
        45%,54% {transform:translate(361px,386px) scale(1.13,1.13);animation-timing-function:cubic-bezier(.55,0,.65,.5)}
        72% {transform:translate(276px,353px) scale(1.22,.84);animation-timing-function:cubic-bezier(.2,.7,.2,1)}
        89% {transform:translate(199px,335px) scale(.96,1.04);animation-timing-function:ease-in-out}
        97%,100% {transform:translate(207px,335px)}
      }
      @keyframes coalescence-right {
        0%,7% {transform:translate(593px,335px);animation-timing-function:cubic-bezier(.45,0,.65,.2)}
        14% {transform:translate(606px,335px) scale(.97,1.03);animation-timing-function:cubic-bezier(.2,.7,.2,1)}
        33% {transform:translate(475px,380px) scale(1.12,.94);animation-timing-function:ease-in-out}
        45%,54% {transform:translate(439px,386px) scale(1.13,1.13);animation-timing-function:cubic-bezier(.55,0,.65,.5)}
        72% {transform:translate(524px,353px) scale(1.22,.84);animation-timing-function:cubic-bezier(.2,.7,.2,1)}
        89% {transform:translate(601px,335px) scale(.96,1.04);animation-timing-function:ease-in-out}
        97%,100% {transform:translate(593px,335px)}
      }
      @keyframes coalescence-drop {
        0%,13% {transform:translate(400px,597px);animation-timing-function:cubic-bezier(.4,0,.65,.2)}
        20% {transform:translate(400px,612px) scale(1.03,.96);animation-timing-function:cubic-bezier(.2,.7,.2,1)}
        40% {transform:translate(400px,476px) scale(.9,1.2);animation-timing-function:ease-in-out}
        49%,58% {transform:translate(400px,440px) scale(1.16);animation-timing-function:cubic-bezier(.55,0,.65,.5)}
        76% {transform:translate(400px,526px) scale(.82,1.27);animation-timing-function:cubic-bezier(.2,.7,.2,1)}
        92% {transform:translate(400px,604px) scale(1.04,.96);animation-timing-function:ease-in-out}
        100% {transform:translate(400px,597px)}
      }
    `}</style>
    </GeometryStage>
  );
}
