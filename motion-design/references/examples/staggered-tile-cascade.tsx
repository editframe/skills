import { GeometryStage, Artboard, type StudyProps } from "./shared/geometry-studies";
export const duration = 5.6;
export const posterTime = 1.7;
export const aspect = "square" as const;
const colors = ["#f6bd48", "#f4663b", "#92aa92", "#e6dfcd"];

// The impulse crosses a persistent grid, then returns from the opposite corner.
export function Video({ id, aspect: frame = aspect }: StudyProps) {
  return (
    <GeometryStage id={id} aspect={frame} duration={duration} background="#223d40" ink="#e6dfcd">
      <Artboard aspect={frame} size={620}>
        <div
          style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, height: "100%" }}
        >
          {Array.from({ length: 16 }, (_, i) => {
            const row = Math.floor(i / 4),
              col = i % 4;
            const a = 8 + (row + col) * 3.3;
            const b = 56 + (6 - row - col) * 3.3;
            return (
              <div
                key={i}
                style={{
                  position: "relative",
                  overflow: "hidden",
                  background: colors[(row + col) % 4],
                  animation: `geo-tile-${i} ${duration}s linear both`,
                  transformOrigin: "50% 50%",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: i % 3 === 0 ? "50%" : "100% 0 0 0",
                    background: colors[(row + col + 2) % 4],
                    transform: `rotate(${(i % 4) * 90}deg)`,
                  }}
                />
                {i % 3 === 1 && (
                  <div
                    style={{
                      position: "absolute",
                      inset: "30%",
                      borderRadius: "50%",
                      background: colors[(row + col) % 4],
                    }}
                  />
                )}
                <style>{`@keyframes geo-tile-${i}{
            0%,${a}%{transform:translateY(0) scale(1);animation-timing-function:cubic-bezier(.45,0,.7,.3)}
            ${a + 3}%{transform:translateY(5px) scale(1.04,.91);animation-timing-function:cubic-bezier(.16,.7,.2,1)}
            ${a + 9}%{transform:translateY(-18px) scale(.95,1.05);animation-timing-function:cubic-bezier(.5,0,.5,1)}
            ${a + 17}%,${b}%{transform:translateY(0) scale(1);animation-timing-function:cubic-bezier(.45,0,.7,.3)}
            ${b + 3}%{transform:translateY(-4px) scale(1.04,.91);animation-timing-function:cubic-bezier(.16,.7,.2,1)}
            ${b + 9}%{transform:translateY(15px) scale(.96,1.04);animation-timing-function:cubic-bezier(.5,0,.5,1)}
            ${b + 17}%,100%{transform:translateY(0) scale(1)}
          }`}</style>
              </div>
            );
          })}
        </div>
      </Artboard>
    </GeometryStage>
  );
}
