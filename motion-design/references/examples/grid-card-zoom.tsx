import type { CSSProperties } from "react";
import { Card, LINE, MUTED, Reveal, Solo } from "../src/primitives";

const CELLS = ["Brief", "Deploy", "Checks", "SKU"];
const COLS = 2;
const CARD_W = 360;
const CARD_H = 220;
const GAP = 24;
const TARGET = 1;
const SCALE = 2.15;

export const duration = 4.4;
export const aspect = "landscape" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  const col = TARGET % COLS;
  const row = Math.floor(TARGET / COLS);
  const originX = col * (CARD_W + GAP);
  const originY = row * (CARD_H + GAP);
  const tx = -originX * (SCALE - 1);
  const ty = -originY * (SCALE - 1);

  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <div className="flex h-full w-full items-center justify-center">
        <div
          style={
            {
              transformOrigin: "0 0",
              animation: "camera-zoom 1200ms 480ms cubic-bezier(0.65,0,0.35,1) both",
              "--cam-s0": 1,
              "--cam-s1": SCALE,
              "--cam-x0": "0px",
              "--cam-y0": "0px",
              "--cam-x1": `${tx}px`,
              "--cam-y1": `${ty}px`,
            } as CSSProperties
          }
        >
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${COLS}, ${CARD_W}px)`,
              gap: GAP,
            }}
          >
            {CELLS.map((label, i) => (
              <Reveal key={label} enter={[i * 80, i * 80 + 360]} y={16} scaleFrom={0.97}>
                <Card
                  className="flex flex-col justify-between p-8"
                  style={{ width: CARD_W, height: CARD_H, border: `1px solid ${LINE}` }}
                >
                  <div
                    className="text-sm font-semibold uppercase"
                    style={{ letterSpacing: "0.14em", color: MUTED }}
                  >
                    WORKSPACE
                  </div>
                  <div className="text-4xl font-semibold tracking-tight">{label}</div>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </Solo>
  );
}
