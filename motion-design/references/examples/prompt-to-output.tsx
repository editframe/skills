import { Timegroup } from "@editframe/react";
import {
  ACCENT,
  Card,
  CREAM,
  ExampleRoot,
  INK,
  Kicker,
  LINE,
  MUTED,
  Reveal,
  Scene,
  Spinner,
} from "../src/primitives";

const OVERLAP = 0.4;
const LOG = ["reading brief", "layout CAN", "write SKU"];

export const duration = 12;
export const aspect = "landscape" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <ExampleRoot id={id} aspect={frame}>
      <Timegroup mode="sequence" overlap={OVERLAP} className="absolute inset-0">
        <Scene duration={4.5} className="flex items-center justify-center">
          <div className="w-[min(920px,var(--measure))]">
            <Reveal enter={[0, 280]} y={8} className="mb-6">
              <Kicker>Brief</Kicker>
            </Reveal>
            <div
              className="relative overflow-hidden rounded-2xl px-10 py-8"
              style={{
                background: `${ACCENT}14`,
                outline: `2px solid ${ACCENT}`,
                animation: "box-grow 2.8s cubic-bezier(0.33,1,0.68,1) both",
              }}
            >
              <div
                className="absolute left-3 top-3 h-3 w-3 rounded-sm"
                style={{ background: ACCENT, animation: "fade-in 200ms 80ms both" }}
              />
              <div
                className="absolute right-3 top-3 h-3 w-3 rounded-sm"
                style={{ background: ACCENT, animation: "fade-in 200ms 80ms both" }}
              />
              <div
                className="overflow-hidden whitespace-nowrap text-4xl font-medium tracking-tight"
                style={{ animation: "logo-wipe 2s steps(32, end) 200ms both" }}
              >
                Make a lockup for CAN
              </div>
              <div
                className="mt-4 overflow-hidden whitespace-nowrap text-4xl font-medium tracking-tight"
                style={{ animation: "logo-wipe 1.3s steps(24, end) 2100ms both" }}
              >
                cream ground, one mark
              </div>
            </div>
          </div>
          <style>{`
            @keyframes box-grow {
              from { min-height: 120px; }
              to { min-height: 200px; }
            }
          `}</style>
        </Scene>

        <Scene duration={4.4} className="flex flex-col items-center justify-center">
          <Reveal enter={[40, 320]} y={12} exit="transition">
            <Spinner size={56} />
          </Reveal>
          <div className="mt-10">
            {LOG.map((line, i) => (
              <Reveal
                key={line}
                enter={[400 + i * 420, 400 + i * 420 + 240]}
                y={10}
                exit="transition"
              >
                <div className="mb-3 text-center font-mono text-2xl" style={{ color: MUTED }}>
                  {line}
                </div>
              </Reveal>
            ))}
          </div>
        </Scene>

        <Scene duration={3.9} className="flex items-center justify-center">
          <Reveal enter={[40, 520]} y={20} scaleFrom={0.86} easeIn="out-back">
            <Card className="overflow-hidden" style={{ width: 420, height: 520 }}>
              <div className="flex h-full flex-col">
                <div
                  className="flex flex-1 items-center justify-center"
                  style={{ background: ACCENT }}
                >
                  <div className="text-6xl font-semibold tracking-tight text-white">CAN</div>
                </div>
                <div className="px-8 py-7" style={{ background: CREAM }}>
                  <Kicker>artifact</Kicker>
                  <div
                    className="mt-2 text-3xl font-semibold tracking-tight"
                    style={{ color: INK }}
                  >
                    Lockup 01
                  </div>
                </div>
              </div>
            </Card>
          </Reveal>
        </Scene>
      </Timegroup>
    </ExampleRoot>
  );
}
