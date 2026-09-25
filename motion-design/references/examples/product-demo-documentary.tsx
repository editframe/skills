import { Timegroup } from "@editframe/react";
import {
  Check,
  Cursor,
  ExampleRoot,
  Kicker,
  StudyMarker,
  Mono,
  Reveal,
  Scene,
  SELECT,
  SUCCESS,
  Window,
  DisplayText,
} from "../src/primitives";

const OVERLAP = 0.4;
const LINES = [
  { t: 400, text: "$ can init", dim: false },
  { t: 1100, text: "  scaffold workspace", dim: true },
  { t: 1600, text: "  write deploy.yml", dim: true },
  { t: 2800, text: "$ can check", dim: false },
  { t: 3400, text: "  lint · types · tests", dim: true },
  { t: 4100, text: "  4 checks passed", dim: true },
  { t: 5600, text: "$ can deploy", dim: false },
  { t: 6400, text: "  packing artifact", dim: true },
  { t: 7200, text: "  uploading SKU", dim: true },
  { t: 10200, text: "  shipped", dim: false, done: true },
];

export const duration = 20;
export const aspect = "landscape" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <ExampleRoot id={id} aspect={frame} theme="saas">
      <Timegroup mode="sequence" overlap={OVERLAP} className="absolute inset-0">
        <Scene duration={14} className="flex items-center justify-center">
          <div style={{ animation: "doc-cam 14s linear both" }}>
            <Reveal enter={[0, 560]} y={24} scaleFrom={0.94} exit="transition">
              <Window title="workspace" width={1280} height={720}>
                <div className="relative h-full overflow-hidden px-10 py-8">
                  <div
                    className="pointer-events-none absolute inset-y-0 w-28"
                    style={{
                      background:
                        "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)",
                      animation: "sheen 1600ms 900ms ease-in-out both",
                    }}
                  />
                  {LINES.map((line) => (
                    <div
                      key={line.text}
                      className="text-2xl leading-[1.7]"
                      style={{
                        color: line.done
                          ? SUCCESS
                          : line.dim
                            ? "rgba(244,241,234,0.42)"
                            : "#f4f1ea",
                        animation: `caption-up 280ms ${line.t}ms cubic-bezier(0.33,1,0.68,1) both`,
                      }}
                    >
                      <Mono>
                        {line.done ? (
                          <span className="inline-flex items-center gap-3">
                            <Check delay={10200} size={28} />
                            shipped
                          </span>
                        ) : (
                          line.text
                        )}
                      </Mono>
                    </div>
                  ))}
                  <div
                    className="absolute bottom-10 right-12 overflow-hidden rounded-lg px-8 py-3 text-xl font-semibold"
                    style={{
                      background: SELECT,
                      color: "#fff",
                      animation: `press-pop 280ms 9800ms cubic-bezier(0.33,1,0.68,1) both`,
                    }}
                  >
                    Deploy
                  </div>
                  <Cursor x={1088} y={612} delay={9200} duration={500} />
                </div>
              </Window>
            </Reveal>
          </div>
          <style>{`
            @keyframes doc-cam {
              0% { transform: scale(0.9); }
              8% { transform: scale(1); }
              20% { transform: scale(1); }
              26% { transform: scale(1.42) translate(-90px, 12px); }
              46% { transform: scale(1.42) translate(-90px, 12px); }
              56% { transform: scale(1) translate(0, 0); }
              68% { transform: scale(1) translate(0, 0); }
              76% { transform: scale(1.38) translate(210px, 70px); }
              100% { transform: scale(1.38) translate(210px, 70px); }
            }
          `}</style>
        </Scene>

        <Scene duration={3.4} className="flex flex-col items-center justify-center">
          <Reveal enter={[80, 480]} y={0} exit="transition">
            <Kicker>from the log</Kicker>
            <div
              className="mt-6 text-7xl font-semibold tracking-tight"
              style={{ animation: "title-in 400ms 120ms both, title-out 280ms 2400ms forwards" }}
            >
              Ship from the brief.
            </div>
          </Reveal>
        </Scene>

        <Scene duration={3.4} className="flex flex-col items-center justify-center">
          <Reveal enter={[40, 480]} y={0} scaleFrom={0.82} easeIn="out-back">
            <StudyMarker letter="01" size={108} />
          </Reveal>
          <Reveal enter={[360, 700]} y={12} className="mt-8">
            <DisplayText size={68} serif={false}>
              WORKSPACE
            </DisplayText>
          </Reveal>
        </Scene>
      </Timegroup>
    </ExampleRoot>
  );
}
