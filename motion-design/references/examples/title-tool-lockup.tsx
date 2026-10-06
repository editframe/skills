import { Timegroup } from "@editframe/react";
import {
  ACCENT,
  Cursor,
  ExampleRoot,
  INK,
  Kicker,
  LINE,
  StudyMarker,
  MUTED,
  PANEL,
  Reveal,
  Scene,
  Window,
  DisplayText,
} from "../src/primitives";

const OVERLAP = 0.4;
const WORDS = ["One", "surface."];

export const duration = 11;
export const aspect = "landscape" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <ExampleRoot id={id} aspect={frame}>
      <Timegroup mode="sequence" overlap={OVERLAP} className="absolute inset-0">
        <Scene duration={3} className="flex items-center justify-center">
          <div className="flex gap-6 text-8xl font-semibold tracking-tight">
            {WORDS.map((word, i) => (
              <Reveal key={word} enter={[80 + i * 90, 80 + i * 90 + 320]} y={20} exit="transition">
                {word}
              </Reveal>
            ))}
          </div>
        </Scene>

        <Scene duration={6.4} className="flex items-center justify-center">
          <div style={{ animation: "tool-cam 6.4s linear both" }}>
            <Reveal enter={[0, 420]} y={16} exit="transition">
              <Window title="studio" width={1180} height={640}>
                <div className="relative h-full" style={{ background: PANEL }}>
                  <div className="absolute left-8 top-8">
                    <Kicker>Canvas</Kicker>
                  </div>
                  <div
                    className="absolute left-1/2 top-1/2 rounded-[28px]"
                    style={{
                      width: 260,
                      height: 260,
                      marginLeft: -130,
                      marginTop: -130,
                      background: ACCENT,
                      animation: "slam 480ms 600ms cubic-bezier(0.34,1.56,0.64,1) both",
                    }}
                  />
                  <div
                    className="absolute right-0 top-0 h-full px-8 py-8"
                    style={{
                      width: 320,
                      background: "#fffaf2",
                      borderLeft: `1px solid ${LINE}`,
                      color: INK,
                      animation: "panel-in 480ms 2200ms cubic-bezier(0.33,1,0.68,1) both",
                    }}
                  >
                    <div className="text-sm uppercase tracking-[0.16em]" style={{ color: MUTED }}>
                      Layer
                    </div>
                    <div className="mt-4 text-2xl font-semibold tracking-tight">Shape</div>
                    <div
                      className="mt-8 rounded-lg px-5 py-3 text-center text-lg font-semibold text-white"
                      style={{
                        background: ACCENT,
                        animation: "press-pop 260ms 4200ms cubic-bezier(0.33,1,0.68,1) both",
                      }}
                    >
                      Place
                    </div>
                  </div>
                  <Cursor x={980} y={210} delay={3600} duration={480} />
                </div>
              </Window>
            </Reveal>
          </div>
          <style>{`
            @keyframes tool-cam {
              0%, 28% { transform: scale(1); }
              38%, 72% { transform: scale(1.22) translate(80px, 10px); }
              84%, 100% { transform: scale(1); }
            }
          `}</style>
        </Scene>

        <Scene duration={2.4} className="flex flex-col items-center justify-center">
          <Reveal enter={[40, 400]} y={0} scaleFrom={0.8} easeIn="out-back">
            <StudyMarker letter="01" size={100} />
          </Reveal>
          <Reveal enter={[260, 520]} y={10} className="mt-6">
            <DisplayText size={60}>YOUR CANVAS</DisplayText>
          </Reveal>
        </Scene>
      </Timegroup>
    </ExampleRoot>
  );
}
