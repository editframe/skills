import { GeometryStage, Artboard, type StudyProps } from "./shared/geometry-studies";
export const duration = 8;
export const posterTime = 2.4;
export const aspect = "landscape" as const;

// Two fixed emitters send fronts through a shared field; the sources do not scale.
export function Video({ id, aspect: frame = aspect }: StudyProps) {
  const clipId = `wave-field-${id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  return (
    <GeometryStage id={id} aspect={frame} duration={duration} background="#e9e4db" ink="#343464">
      <Artboard aspect={frame} size={740}>
        <svg
          viewBox="0 0 740 740"
          width="100%"
          height="100%"
          aria-label="Circular wave fronts travel outward from two stationary sources"
        >
          <defs>
            <clipPath id={clipId}>
              <circle cx="370" cy="370" r="360" />
            </clipPath>
          </defs>
          <g clipPath={`url(#${clipId})`}>
            <circle cx="370" cy="370" r="360" fill="#dfd6d3" />
            {[0, 1].map((layer) => (
              <g
                key={layer}
                fill="none"
                stroke={layer ? "#e86742" : "#343464"}
                strokeWidth={layer ? 3 : 4}
                opacity={layer ? 0.82 : 1}
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <circle
                    key={i}
                    cx={layer ? 452 : 288}
                    cy="370"
                    r="0"
                    style={{
                      animation: `geo-wave-front 8s ${(-(i + layer * 0.5) * 8) / 24}s linear infinite`,
                    }}
                  />
                ))}
              </g>
            ))}
            {[288, 452].map((x, i) => (
              <circle key={x} cx={x} cy="370" r="5" fill={i ? "#e86742" : "#343464"} />
            ))}
          </g>
          <circle cx="370" cy="370" r="369" fill="none" stroke="#34346455" />
        </svg>
      </Artboard>
      <style>{`@keyframes geo-wave-front{0%{r:0px;opacity:0}2%{opacity:1}90%{opacity:1}100%{r:820px;opacity:0}}`}</style>
    </GeometryStage>
  );
}
