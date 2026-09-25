import { GeometryStage, Artboard, absolute, type StudyProps } from "./shared/geometry-studies";
export const duration = 5.4;
export const posterTime = 2.7;
export const aspect = "landscape" as const;
function Composition({
  alternate,
  frame,
}: {
  alternate: boolean;
  frame: NonNullable<StudyProps["aspect"]>;
}) {
  return (
    <Artboard aspect={frame} size={650}>
      <svg
        viewBox="0 0 650 650"
        width="100%"
        height="100%"
        aria-label={alternate ? "Three coral arches" : "An indigo disc and orbit"}
      >
        {alternate ? (
          <>
            {[130, 265, 400].map((x, i) => (
              <path
                key={x}
                d={`M${x} 510V250a60 60 0 0 1 120 0V510Z`}
                fill={i === 1 ? "#f7bc48" : "#ed633f"}
              />
            ))}
            <path d="M95 535H555" stroke="#eae1d0" strokeWidth="3" />
          </>
        ) : (
          <>
            <circle cx="325" cy="325" r="210" fill="#191a4e" />
            <ellipse
              cx="325"
              cy="325"
              rx="265"
              ry="75"
              transform="rotate(-32 325 325)"
              stroke="#ed633f"
              strokeWidth="17"
              fill="none"
            />
            <circle cx="535" cy="195" r="28" fill="#ed633f" />
          </>
        )}
      </svg>
    </Artboard>
  );
}
export function Video({ id, aspect: frame = aspect }: StudyProps) {
  return (
    <GeometryStage id={id} aspect={frame} duration={duration} background="#eae1d0" ink="#191a4e">
      <Composition alternate={false} frame={frame} />
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            ...absolute,
            clipPath: `inset(${(i * 100) / 3}% 0 ${100 - ((i + 1) * 100) / 3}% 0)`,
          }}
        >
          <div
            style={{
              ...absolute,
              background: "#191a4e",
              animation: `geo-panel-${i} 5.4s linear both`,
            }}
          >
            <Composition alternate frame={frame} />
          </div>
        </div>
      ))}
      <style>
        {[0, 1, 2]
          .map(
            (i) => `@keyframes geo-panel-${i} {
   0%,${18 + i * 2}%{transform:translateX(-101%);animation-timing-function:cubic-bezier(.7,0,.2,1)}
   ${36 + i * 2}%,${65 + i * 2}%{transform:translateX(0);animation-timing-function:cubic-bezier(.7,0,.2,1)}
   ${83 + i * 2}%,100%{transform:translateX(101%)}
  }`,
          )
          .join("\n")}
      </style>
    </GeometryStage>
  );
}
