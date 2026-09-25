import { type Aspect } from "../src/primitives";
import { SpatialStudy } from "./shared/SpatialStudy";
export const duration = 5;
export const posterTime = 2.7;
export const aspect = "landscape" as const;

// Every fragment keeps its identity. A diagonal assembly front resolves into a grid.
export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  return (
    <SpatialStudy id={id} aspect={frame} duration={duration} background="#242824" color="#d7e7b1">
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
        <div
          style={{
            width: "43cqmin",
            height: "43cqmin",
            position: "relative",
            transform: "rotate(-10deg)",
          }}
        >
          {Array.from({ length: 64 }, (_, i) => {
            const row = Math.floor(i / 8),
              col = i % 8;
            const x = (col - 3.5) * 5.5,
              y = (row - 3.5) * 5.5;
            // A bijective lattice permutation spreads fragments without clipping or random overlap.
            const cell = (i * 29) % 64;
            const sx = ((cell % 8) - 3.5) * 8,
              sy = (Math.floor(cell / 8) - 3.5) * 8;
            const a = 9 + (row + col) * 1.15;
            const b = 67 + (14 - row - col) * 0.65;
            const angle = ((i % 5) - 2) * 27;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: "4.8cqmin",
                  height: "4.8cqmin",
                  margin: "-2.4cqmin",
                  background: i % 9 === 0 ? "#a297d2" : "#d7e7b1",
                  borderRadius: ".2cqmin",
                  animation: `study-converge-${i} ${duration}s linear both`,
                }}
              >
                <style>{`@keyframes study-converge-${i}{
        0%,${a}%{transform:translate(${sx}cqmin,${sy}cqmin) rotate(${angle}deg) scale(.48);animation-timing-function:cubic-bezier(.65,0,.18,1)}
        ${a + 26}%,${b}%{transform:translate(${x}cqmin,${y}cqmin) rotate(0deg) scale(1);animation-timing-function:cubic-bezier(.55,0,.35,1)}
        ${b + 22}%,100%{transform:translate(${sx}cqmin,${sy}cqmin) rotate(${angle}deg) scale(.48)}
       }`}</style>
              </div>
            );
          })}
        </div>
      </div>
    </SpatialStudy>
  );
}
