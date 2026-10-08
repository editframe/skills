import { ACCENT, Chip, Reveal, Solo, Spinner, Window } from "../src/primitives";

const STRIPS = [
  { left: "82%", delay: 980, hold: 1480 },
  { left: "68%", delay: 1100, hold: 1620 },
  { left: "54%", delay: 1220, hold: 1760 },
  { left: "40%", delay: 1340, hold: 1900 },
  { left: "26%", delay: 1460, hold: 2040 },
  { left: "12%", delay: 1580, hold: 2180 },
];

export const duration = 4;
export const aspect = "landscape" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <div className="flex h-full w-full items-center justify-center">
        <Reveal enter={[0, 420]} y={24}>
          <Window title="generate" width={880} height={520}>
            <div className="relative h-full overflow-hidden px-8 py-7">
              <div className="mb-6 flex gap-3">
                <Chip delay={180}>Brief</Chip>
                <Chip delay={280} active>
                  Deploy
                </Chip>
              </div>
              <div className="text-2xl font-medium text-white/80">
                Make a product still of CAN 01
              </div>
              <div
                className="absolute bottom-7 right-8 flex h-14 w-14 items-center justify-center rounded-full"
                style={{
                  background: ACCENT,
                  animation: "press-pop 280ms 860ms both",
                }}
              >
                ↑
              </div>
              {STRIPS.map((s) => (
                <div
                  key={s.left}
                  className="led-strip absolute top-0 h-full w-[15%]"
                  style={{
                    left: s.left,
                    animation: [
                      `led-window 280ms ${s.delay}ms both`,
                      `led-shimmer 360ms ${s.delay}ms linear infinite`,
                      `hide 220ms ${s.hold}ms forwards`,
                    ].join(", "),
                  }}
                />
              ))}
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  animation: "fade-in 200ms 1680ms both, hide 120ms 2080ms forwards",
                }}
              >
                <Spinner size={48} />
              </div>
              <div
                className="absolute inset-8 overflow-hidden rounded-xl"
                style={{
                  background: ACCENT,
                  animation: "result-in 420ms 2100ms cubic-bezier(0.33,1,0.68,1) both",
                }}
              >
                <div className="flex h-full items-center justify-center text-5xl font-semibold text-white">
                  01
                </div>
              </div>
            </div>
          </Window>
        </Reveal>
      </div>
      <style>{`
        .led-strip {
          opacity: 0;
          transform-origin: 50% 80%;
          background-image:
            radial-gradient(circle, rgba(196, 30, 58, 0.95) 1.8px, transparent 2.4px),
            radial-gradient(circle, rgba(196, 30, 58, 0.28) 3.4px, transparent 5px);
          background-size: 12px 12px, 12px 12px;
          mask-image: radial-gradient(ellipse 70% 80% at 50% 55%, #000 48%, transparent 96%);
        }
        @keyframes led-window {
          from { opacity: 0; transform: scaleY(0.35); }
          to { opacity: 0.85; transform: scaleY(1); }
        }
        @keyframes led-shimmer {
          50% { filter: brightness(1.45); }
        }
        @keyframes result-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </Solo>
  );
}
