import { GeometryStage, Artboard, type StudyProps } from "./shared/geometry-studies";
export const duration = 6;
export const aspect = "landscape" as const;
export function Video({ id, aspect: frame = aspect }: StudyProps) {
  return (
    <GeometryStage id={id} aspect={frame} duration={duration} background="#182439" ink="#f3e7d1">
      <Artboard aspect={frame} size={740}>
        <svg width="100%" height="100%" viewBox="0 0 740 740" fill="none">
          {Array.from({ length: 9 }, (_, i) => (
            <path
              key={i}
              d={`M ${125 + i * 15} 610 L ${125 + i * 15} ${265 - i * 8} A ${245 - i * 15} ${245 - i * 15} 0 0 1 ${615 - i * 15} ${265 - i * 8} L ${615 - i * 15} 610`}
              stroke={i === 4 ? "#fb785b" : "#f3e7d1"}
              strokeWidth={i === 4 ? 8 : 3}
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={1}
              style={{ animation: `geo-stroke 6s ${i * 0.11}s cubic-bezier(.45,0,.55,1) both` }}
            />
          ))}
          <circle cx="370" cy="610" r="12" fill="#fb785b" />
        </svg>
      </Artboard>
      <style>{`@keyframes geo-stroke {0%,5%{stroke-dashoffset:1;opacity:.4} 40%,66%{stroke-dashoffset:0;opacity:1} 82%,100%{stroke-dashoffset:-1;opacity:.4}}`}</style>
    </GeometryStage>
  );
}
