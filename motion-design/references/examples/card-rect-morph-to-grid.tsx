import { ACCENT, Card, INK, LINE, MUTED, NAVY, Reveal, Solo } from "../src/primitives";

export const duration = 5;
export const aspect = "landscape" as const;

const HERO = { x: 580, y: 180, w: 760, h: 560 };
const SLOT = { x: 200, y: 140, w: 720, h: 380 };
const OTHERS = [
  { x: 960, y: 140, w: 720, h: 380, title: "Resolution", value: "74%", popAt: 2140 },
  { x: 200, y: 560, w: 720, h: 380, title: "Handle", value: "6m", popAt: 2300 },
  { x: 960, y: 560, w: 720, h: 380, title: "Abandon", value: "2.5%", popAt: 2460 },
];

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <div
        className="pointer-events-none absolute"
        style={{
          left: 180,
          top: 110,
          width: 1560,
          height: 860,
          border: `1px solid ${LINE}`,
          opacity: 0,
          animation: "fade-in 400ms 1900ms both",
        }}
      />

      <div
        className="absolute overflow-hidden"
        style={{
          left: HERO.x,
          top: HERO.y,
          width: HERO.w,
          height: HERO.h,
          animation: "morph-rect 560ms 1480ms cubic-bezier(0.45,0,0.55,1) both",
        }}
      >
        <Card className="h-full p-10">
          <div
            className="text-sm font-semibold uppercase tracking-[0.16em]"
            style={{ color: MUTED }}
          >
            Checks
          </div>
          <div className="mt-2 text-7xl font-semibold tracking-tight" style={{ color: NAVY }}>
            4.1
          </div>
          <div className="mt-8 flex h-40 items-end gap-3">
            {[42, 58, 51, 70, 64, 78, 86].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm"
                style={{
                  height: `${h}%`,
                  background: i === 6 ? ACCENT : LINE,
                }}
              />
            ))}
          </div>
        </Card>
      </div>

      {OTHERS.map((cell) => (
        <Reveal
          key={cell.title}
          enter={[cell.popAt, cell.popAt + 240]}
          y={12}
          scaleFrom={0.86}
          className="absolute"
          style={{ left: cell.x, top: cell.y, width: cell.w, height: cell.h }}
        >
          <Card className="flex h-full flex-col justify-between p-10">
            <div
              className="text-sm font-semibold uppercase tracking-[0.16em]"
              style={{ color: MUTED }}
            >
              {cell.title}
            </div>
            <div className="text-7xl font-semibold tracking-tight" style={{ color: INK }}>
              {cell.value}
            </div>
            <div className="h-2 w-24 rounded-full" style={{ background: ACCENT }} />
          </Card>
        </Reveal>
      ))}
      <style>{`
        @keyframes morph-rect {
          from { left: ${HERO.x}px; top: ${HERO.y}px; width: ${HERO.w}px; height: ${HERO.h}px; }
          to { left: ${SLOT.x}px; top: ${SLOT.y}px; width: ${SLOT.w}px; height: ${SLOT.h}px; }
        }
      `}</style>
    </Solo>
  );
}
