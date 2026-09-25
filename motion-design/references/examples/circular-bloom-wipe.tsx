import { GeometryStage, Artboard, absolute, type StudyProps } from "./shared/geometry-studies";
export const duration = 5.6;
export const posterTime = 2.6;
export const aspect = "landscape" as const;
export function Video({ id, aspect: frame = aspect }: StudyProps) {
  return (
    <GeometryStage id={id} aspect={frame} duration={duration} background="#e9e8dc" ink="#263b29">
      <Artboard aspect={frame} size={650}>
        <svg
          viewBox="0 0 650 650"
          width="100%"
          height="100%"
          aria-label="An orbit opens into a radial bloom"
        >
          {[120, 175, 230].map((r) => (
            <circle key={r} cx="325" cy="325" r={r} stroke="#a6b990" strokeWidth="3" fill="none" />
          ))}
          <circle cx="325" cy="325" r="48" fill="#263b29" />
          <circle cx="555" cy="325" r="13" fill="#263b29" />
        </svg>
      </Artboard>
      {["#263b29", "#a6b990", "#e6ef54"].map((color, i) => (
        <div
          key={color}
          style={{ ...absolute, background: color, animation: `geo-bloom-${i} 5.6s linear both` }}
        >
          {i === 2 && (
            <Artboard aspect={frame} size={650}>
              <svg viewBox="0 0 650 650" width="100%" height="100%" aria-hidden="true">
                {Array.from({ length: 12 }, (_, n) => (
                  <rect
                    key={n}
                    x="309"
                    y="92"
                    width="32"
                    height="148"
                    rx="16"
                    transform={`rotate(${n * 30} 325 325)`}
                    fill="#263b29"
                  />
                ))}
                <circle cx="325" cy="325" r="48" fill="#263b29" />
              </svg>
            </Artboard>
          )}
        </div>
      ))}
      <style>
        {[0, 1, 2]
          .map(
            (i) => `@keyframes geo-bloom-${i} {
   0%,${17 + i * 2}%{clip-path:circle(0% at 50% 50%);animation-timing-function:cubic-bezier(.65,0,.2,1)}
   ${40 + i * 2}%,${64 + (2 - i) * 2}%{clip-path:circle(75% at 50% 50%);animation-timing-function:cubic-bezier(.65,0,.2,1)}
   ${87 + (2 - i) * 2}%,100%{clip-path:circle(0% at 50% 50%)}
  }`,
          )
          .join("\n")}
      </style>
    </GeometryStage>
  );
}
