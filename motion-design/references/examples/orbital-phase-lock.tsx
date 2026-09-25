import { GeometryStage, Artboard, type StudyProps } from "./shared/geometry-studies";
export const duration = 8;
export const posterTime = 4.9;
export const aspect = "square" as const;
export function Video({ id, aspect: frame = aspect }: StudyProps) {
  return (
    <GeometryStage id={id} aspect={frame} duration={duration} background="#112d2f" ink="#e8e0b9">
      <Artboard aspect={frame} size={700}>
        <svg
          width="700"
          height="700"
          viewBox="0 0 700 700"
          fill="none"
          aria-label="Three independent orbits synchronize, travel together, and release"
        >
          <path d="M350 35V665M35 350H665" stroke="#e8e0b9" strokeOpacity=".13" />
          <g style={{ transformOrigin: "350px 350px", animation: "geo-lock-ray 8s linear both" }}>
            <path
              d="M350 350V54"
              stroke="#e8e0b9"
              strokeOpacity=".38"
              strokeWidth="2"
              strokeDasharray="3 9"
            />
          </g>
          {[110, 195, 280].map((r, i) => (
            <g key={r}>
              <circle
                cx="350"
                cy="350"
                r={r}
                stroke="#e8e0b9"
                strokeOpacity=".26"
                strokeWidth="1.5"
              />
              <g
                style={{
                  transformOrigin: "350px 350px",
                  animation: `geo-orbit-${i} 8s linear both`,
                }}
              >
                <circle
                  cx="350"
                  cy={350 - r}
                  r={17 + i * 7}
                  fill={["#e8e0b9", "#e8a363", "#8dada0"][i]}
                />
                <circle cx="350" cy={350 + r} r={4} fill="#e8e0b9" fillOpacity=".7" />
              </g>
            </g>
          ))}
          <circle cx="350" cy="350" r="21" fill="#e8e0b9" />
        </svg>
      </Artboard>
      <style>{`
      @keyframes geo-orbit-0{0%,5%{transform:rotate(0deg);animation-timing-function:cubic-bezier(.45,0,.55,1)}38%{transform:rotate(520deg);animation-timing-function:cubic-bezier(.2,.5,.4,1)}52%{transform:rotate(720deg)}72%{transform:rotate(810deg);animation-timing-function:cubic-bezier(.5,0,.35,1)}95%,100%{transform:rotate(1080deg)}}
      @keyframes geo-orbit-1{0%,5%{transform:rotate(120deg);animation-timing-function:cubic-bezier(.45,0,.55,1)}38%{transform:rotate(600deg);animation-timing-function:cubic-bezier(.2,.5,.4,1)}52%{transform:rotate(720deg)}72%{transform:rotate(810deg);animation-timing-function:cubic-bezier(.5,0,.35,1)}95%,100%{transform:rotate(1200deg)}}
      @keyframes geo-orbit-2{0%,5%{transform:rotate(240deg);animation-timing-function:cubic-bezier(.45,0,.55,1)}38%{transform:rotate(680deg);animation-timing-function:cubic-bezier(.2,.5,.4,1)}52%{transform:rotate(720deg)}72%{transform:rotate(810deg);animation-timing-function:cubic-bezier(.5,0,.35,1)}95%,100%{transform:rotate(1320deg)}}
      @keyframes geo-lock-ray{0%,48%{opacity:0;transform:rotate(0deg)}52%{opacity:1;transform:rotate(0deg)}72%{opacity:1;transform:rotate(90deg)}76%,100%{opacity:0;transform:rotate(90deg)}}
    `}</style>
    </GeometryStage>
  );
}
