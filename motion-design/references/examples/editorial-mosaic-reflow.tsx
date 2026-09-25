import { Solo, FONT, type Aspect } from "../src/primitives";

export const duration = 10;
export const posterTime = 3.4;
export const aspect = "landscape" as const;
const palettes = [
  ["#d98466", "#f3c29a", "#903e41"],
  ["#1e5757", "#8eaa91", "#eddbac"],
  ["#b3a7ce", "#71698f", "#f6c388"],
  ["#e5bd55", "#f3df9c", "#ac6c42"],
  ["#486e8f", "#b0c6c2", "#21374e"],
  ["#d7a1a7", "#ab5967", "#f1d9b5"],
];
type Box = [number, number, number, number];

function panelArt(i: number) {
  const [base, light, dark] = palettes[i];
  return (
    <svg
      viewBox="0 0 400 400"
      preserveAspectRatio="xMidYMid slice"
      style={{ width: "100%", height: "100%" }}
    >
      <rect width="400" height="400" fill={base} />
      <circle cx={i % 2 ? 100 : 275} cy={i % 3 ? 90 : 290} r="140" fill={light} />
      {Array.from({ length: 15 }, (_, n) => (
        <path
          key={n}
          d={
            i % 2
              ? `M ${-80 + n * 24} -30 Q ${410 - n * 4} 175 ${60 + n * 20} 450`
              : `M -40 ${15 + n * 24} Q 195 ${390 - n * 9} 450 ${-60 + n * 35}`
          }
          stroke={dark}
          strokeWidth={i === 3 ? 13 : 9}
          fill="none"
          opacity={0.55 + n * 0.024}
        />
      ))}
      {i % 2 === 0 && <circle cx="180" cy="190" r="46" fill={light} />}
    </svg>
  );
}

/** Tile identity survives the change from an equal index to two editorial hierarchies. */
export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  const tall = frame === "portrait";
  const gap = 1.4;
  const cols = tall ? 2 : 3;
  const rows = tall ? 3 : 2;
  const cw = (100 - gap * (cols - 1)) / cols;
  const ch = (100 - gap * (rows - 1)) / rows;
  const equal: Box[] = Array.from({ length: 6 }, (_, i) => [
    (i % cols) * (cw + gap),
    Math.floor(i / cols) * (ch + gap),
    cw,
    ch,
  ]);
  const hierarchy = (hero: number): Box[] => {
    const rest = Array.from({ length: 6 }, (_, i) => i).filter((i) => i !== hero);
    const boxes: Box[] = [];
    boxes[hero] = tall ? [0, 0, 100, 58] : [0, 0, 64, 100];
    rest.forEach((i, n) => {
      boxes[i] = tall
        ? n < 3
          ? [n * 33.8, 59.4, 32.4, 19.6]
          : [(n - 3) * 50.7, 80.4, 49.3, 19.6]
        : n < 4
          ? [65.4 + (n % 2) * 18, Math.floor(n / 2) * 33.8, 16.6, 32.4]
          : [65.4, 67.6, 34.6, 32.4];
    });
    return boxes;
  };
  const first = hierarchy(0);
  const second = hierarchy(3);
  const cssBox = ([x, y, w, h]: Box) => `left:${x}%;top:${y}%;width:${w}%;height:${h}%;`;
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <div style={{ position: "absolute", inset: 0, background: "#ede8df", fontFamily: FONT.mono }}>
        <div
          style={{
            position: "absolute",
            left: "6%",
            right: "6%",
            top: tall ? "12%" : "10%",
            bottom: tall ? "12%" : "10%",
          }}
        >
          {palettes.map((_, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                overflow: "hidden",
                animation: `editorial-mosaic-${i} 10s linear both`,
              }}
            >
              {panelArt(i)}
              <span
                style={{
                  position: "absolute",
                  left: 16,
                  top: 14,
                  fontSize: tall ? 25 : 24,
                  fontWeight: 500,
                  color: "#fffaeb",
                  textShadow: "0 1px 5px #18373255",
                }}
              >
                0{i + 1}
              </span>
              <style>{`@keyframes editorial-mosaic-${i}{
            0%,13%{${cssBox(equal[i])}animation-timing-function:cubic-bezier(.65,0,.2,1)}
            29%,44%{${cssBox(first[i])}animation-timing-function:cubic-bezier(.65,0,.2,1)}
            60%,77%{${cssBox(second[i])}animation-timing-function:cubic-bezier(.65,0,.2,1)}
            94%,100%{${cssBox(equal[i])}}
          }`}</style>
            </div>
          ))}
        </div>
      </div>
    </Solo>
  );
}
