import { ACCENT, Card, Chip, Reveal, Solo, Spinner } from "../src/primitives";

export const duration = 4.5;
export const aspect = "landscape" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <div className="flex h-full w-full items-center justify-center">
        <Reveal enter={[0, 480]} y={28} scaleFrom={0.92}>
          <div
            className="relative"
            style={{ animation: "shrink-corner 520ms 3600ms cubic-bezier(0.45,0,0.55,1) forwards" }}
          >
            <div
              className="pointer-events-none absolute inset-[-40px] rounded-full"
              style={{
                background: `radial-gradient(circle, ${ACCENT}55, transparent 62%)`,
                animation: "halo-glow 1400ms 200ms ease-out both",
              }}
            />
            <Card
              className="relative overflow-hidden"
              style={{
                width: 760,
                height: 420,
                animation: "sheen-breathe 1600ms 200ms ease-in-out infinite",
              }}
            >
              <div
                className="absolute inset-[-40%]"
                style={{
                  background:
                    "conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(255,244,222,0.0) 40deg, rgba(255,244,222,0.7) 108deg, rgba(170,210,255,0.25) 124deg, transparent 150deg)",
                  animation: "spin 3200ms linear infinite",
                  mixBlendMode: "screen",
                }}
              />
              <div
                className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-white/70 to-transparent"
                style={{ animation: "sheen 2200ms 400ms ease-in-out infinite" }}
              />
              <div className="relative flex h-full flex-col items-center justify-center gap-8">
                <div className="text-3xl font-medium">Brief</div>
                <div className="relative">
                  <div
                    className="flex items-center gap-3"
                    style={{ animation: "hide 80ms 2800ms both" }}
                  >
                    <Spinner size={28} />
                    <Chip delay={240}>Analyzing</Chip>
                  </div>
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ animation: "fade-in 220ms 2800ms both" }}
                  >
                    <Chip delay={0} active>
                      Analyzed
                    </Chip>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </Reveal>
      </div>
      <style>{`
        @keyframes sheen-breathe {
          0%, 100% { box-shadow: 0 0 36px 8px rgba(196, 30, 58, 0.22); }
          50% { box-shadow: 0 0 64px 16px rgba(196, 30, 58, 0.42); }
        }
        @keyframes shrink-corner {
          to { transform: translate(38%, 28%) scale(0.36); }
        }
      `}</style>
    </Solo>
  );
}
