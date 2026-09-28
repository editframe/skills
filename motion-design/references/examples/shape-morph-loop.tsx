import { GeometryStage, Artboard, type StudyProps } from "./shared/geometry-studies";
export const duration = 6;
export const posterTime = 2.25;
export const aspect = "square" as const;
export function Video({ id, aspect: frame = aspect }: StudyProps) {
  return (
    <GeometryStage id={id} aspect={frame} duration={duration} background="#bdd3dc" ink="#263764">
      <Artboard aspect={frame} size={650}>
        <div style={{ position: "absolute", inset: 60, border: "1px solid #26376435" }} />
        {[0, 1, 2].map((i) => {
          const lag = i * 2.8;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                inset: 95 + i * 54,
                background: ["#263764", "#ea7654", "#f8df96"][i],
                animation: `geo-morph-${i} 6s linear both`,
              }}
            >
              <style>{`@keyframes geo-morph-${i}{
            0%,${10 + lag}%{border-radius:50%;transform:rotate(0deg) scale(1);animation-timing-function:cubic-bezier(.7,0,.2,1)}
            ${27 + lag}%,${39 + lag}%{border-radius:9%;transform:rotate(90deg) scale(.91);animation-timing-function:cubic-bezier(.65,0,.25,1)}
            ${55 + lag}%,${65 + lag}%{border-radius:50% 9% 50% 9%;transform:rotate(180deg) scale(.94);animation-timing-function:cubic-bezier(.45,0,.25,1)}
            ${89 + lag}%,100%{border-radius:50%;transform:rotate(360deg) scale(1)}
          }`}</style>
            </div>
          );
        })}
      </Artboard>
    </GeometryStage>
  );
}
