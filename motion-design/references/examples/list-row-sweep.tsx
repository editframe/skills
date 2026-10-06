import { ACCENT, Card, Chip, Reveal, Solo } from "../src/primitives";

const ROWS = [
  { title: "Brief 01", meta: "1:12" },
  { title: "Deploy 02", meta: "0:48" },
  { title: "Checks 03", meta: "2:05" },
];

export const duration = 4;
export const aspect = "landscape" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <div className="flex h-full w-full items-center justify-center">
        <div className="w-[min(760px,var(--measure))]">
          {ROWS.map((row, i) => (
            <div key={row.title} className="relative mb-5">
              <div
                className="pointer-events-none absolute -inset-6"
                style={{
                  background: `radial-gradient(ellipse at 20% 50%, ${ACCENT}33, transparent 70%)`,
                  animation: `halo-glow 700ms ${720 + i * 140}ms ease-out both`,
                }}
              />
              <div
                className="overflow-hidden"
                style={{
                  animation: `row-widen 560ms ${180 + i * 140}ms cubic-bezier(0.33,1,0.68,1) both`,
                }}
              >
                <Card className="flex h-[92px] items-center gap-6 px-7" style={{ width: 760 }}>
                  <Reveal enter={[360 + i * 140, 640 + i * 140]} y={10} x={-12}>
                    <Chip delay={0} active={i === 0}>
                      {String(i + 1).padStart(2, "0")}
                    </Chip>
                  </Reveal>
                  <Reveal
                    enter={[420 + i * 140, 720 + i * 140]}
                    y={8}
                    className="flex flex-1 items-center justify-between"
                  >
                    <div className="text-3xl font-medium">{row.title}</div>
                    <div className="text-xl" style={{ color: "#6f6860" }}>
                      {row.meta}
                    </div>
                  </Reveal>
                </Card>
              </div>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes row-widen {
          from { width: 0; }
          to { width: 760px; }
        }
      `}</style>
    </Solo>
  );
}
