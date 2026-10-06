import { Timegroup } from "@editframe/react";
import {
  ACCENT,
  ExampleRoot,
  INK,
  Kicker,
  StudyMarker,
  Mono,
  MUTED,
  Reveal,
  Scene,
  Window,
  DisplayText,
} from "../src/primitives";

const OVERLAP = 0.4;
const LINES = [
  { t: 200, text: "$ can login" },
  { t: 900, text: "  device verified" },
  { t: 1600, text: "$ can init" },
  { t: 2100, text: "  writing config" },
  { t: 2500, text: "  linking SKU" },
  { t: 2900, text: "  seeding checks" },
  { t: 3400, text: "  24 files" },
  { t: 5200, text: "  ✓ ready to deploy" },
];

export const duration = 12;
export const aspect = "landscape" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <ExampleRoot id={id} aspect={frame} background="#141413">
      <Timegroup mode="sequence" overlap={OVERLAP} className="absolute inset-0">
        <Scene
          duration={8}
          className="flex items-center justify-center"
          style={{ background: "#141413" }}
        >
          <div style={{ animation: "term-cam 8s linear both" }}>
            <Reveal enter={[0, 480]} y={16} scaleFrom={0.96} exit="transition">
              <Window title="deploy" width={1200} height={640}>
                <div className="h-full px-10 py-8">
                  {LINES.map((line) => (
                    <div
                      key={line.text}
                      className="font-mono text-2xl leading-[1.75]"
                      style={{
                        color: line.text.includes("✓")
                          ? ACCENT
                          : line.text.startsWith("$")
                            ? "#f3efe6"
                            : MUTED,
                        animation: `caption-up 240ms ${line.t}ms cubic-bezier(0.33,1,0.68,1) both`,
                      }}
                    >
                      <Mono>{line.text}</Mono>
                    </div>
                  ))}
                </div>
              </Window>
            </Reveal>
          </div>
          <style>{`
            @keyframes term-cam {
              0% { transform: scale(0.92); }
              12% { transform: scale(1); }
              28% { transform: scale(1); }
              38% { transform: scale(1.55) translate(-40px, 30px); }
              58% { transform: scale(1.55) translate(-40px, 30px); }
              70% { transform: scale(1) translate(0, 0); }
              82% { transform: scale(1) translate(0, 0); }
              92% { transform: scale(1.48) translate(-120px, 90px); }
              100% { transform: scale(1.48) translate(-120px, 90px); }
            }
          `}</style>
        </Scene>

        <Scene
          duration={2.4}
          className="flex flex-col items-center justify-center"
          style={{ background: "#f7f4ee", color: INK }}
        >
          <div
            className="absolute inset-0"
            style={{ background: "#f7f4ee", animation: "fade-in 300ms both" }}
          />
          <Reveal enter={[40, 360]} y={0} exit="transition">
            <div
              className="text-7xl font-semibold tracking-tight"
              style={{ animation: "title-in 320ms both, title-out 240ms 1700ms forwards" }}
            >
              Ready when you are.
            </div>
          </Reveal>
        </Scene>

        <Scene
          duration={2.4}
          className="flex flex-col items-center justify-center"
          style={{ background: "#f7f4ee", color: INK }}
        >
          <Reveal enter={[40, 400]} y={0} scaleFrom={0.8} easeIn="out-back">
            <StudyMarker letter="01" size={96} />
          </Reveal>
          <Reveal enter={[280, 540]} y={10} className="mt-6">
            <DisplayText size={56}>Ready to build.</DisplayText>
          </Reveal>
          <Reveal enter={[480, 700]} y={6} className="mt-3">
            <Kicker>Start your next project</Kicker>
          </Reveal>
        </Scene>
      </Timegroup>
    </ExampleRoot>
  );
}
