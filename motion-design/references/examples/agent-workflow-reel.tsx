import { Timegroup } from "@editframe/react";
import {
  Card,
  Check,
  Chip,
  Cursor,
  ExampleRoot,
  Mono,
  Reveal,
  Scene,
  SELECT,
  Spinner,
  SUCCESS,
  Window,
} from "../src/primitives";

const OVERLAP = 0.4;
const CHECKS = ["Clone repos", "Configure secrets", "Install deps", "Environment ready"];
const RESOLVE = [1400, 2200, 3000, 3800];
const LOG = [
  { t: 600, text: "queued brief" },
  { t: 1400, text: "open workspace" },
  { t: 2200, text: "run checks" },
  { t: 3000, text: "write SKU" },
  { t: 4000, text: "publish artifact" },
  { t: 5200, text: "shipped", done: true },
];
const SCREENS = ["Welcome", "Topics", "Prefs", "Ready"];

export const duration = 20;
export const aspect = "landscape" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <ExampleRoot id={id} aspect={frame} theme="saas">
      <Timegroup mode="sequence" overlap={OVERLAP} className="absolute inset-0">
        <Brief />
        <Work />
        <Artifact />
      </Timegroup>
    </ExampleRoot>
  );
}

function Brief() {
  return (
    <Scene duration={6} className="flex items-center justify-center">
      <Reveal enter={[0, 480]} y={20} exit="transition">
        <Window title="brief" width={1100} height={520}>
          <div className="relative flex h-full flex-col justify-between overflow-hidden px-12 py-10">
            <div
              className="pointer-events-none absolute inset-y-0 w-24"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)",
                animation: "sheen 1400ms 400ms ease-in-out both",
              }}
            />
            <div>
              <div
                className="mb-5 text-sm uppercase tracking-[0.16em]"
                style={{ color: "rgba(244,241,234,0.45)" }}
              >
                Prompt
              </div>
              <div
                className="relative overflow-hidden rounded-xl px-8 py-6"
                style={{
                  background: "rgba(91,140,255,0.12)",
                  outline: `2px solid ${SELECT}`,
                  animation: "brief-grow 2.4s cubic-bezier(0.33,1,0.68,1) both",
                }}
              >
                <div
                  className="overflow-hidden whitespace-nowrap text-3xl"
                  style={{ animation: "logo-wipe 2.2s steps(36, end) 200ms both" }}
                >
                  <Mono>Design onboarding for CAN</Mono>
                </div>
                <div
                  className="mt-3 overflow-hidden whitespace-nowrap text-3xl"
                  style={{ animation: "logo-wipe 1.4s steps(22, end) 2200ms both" }}
                >
                  <Mono>four screens, then ship</Mono>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <div
                className="rounded-lg px-8 py-3 text-xl font-semibold text-white"
                style={{
                  background: SELECT,
                  animation: "press-pop 260ms 4800ms cubic-bezier(0.33,1,0.68,1) both",
                }}
              >
                Send
              </div>
            </div>
            <Cursor x={980} y={390} delay={4300} duration={420} />
          </div>
        </Window>
      </Reveal>
      <style>{`
        @keyframes brief-grow {
          from { min-height: 96px; }
          to { min-height: 168px; }
        }
      `}</style>
    </Scene>
  );
}

function Work() {
  return (
    <Scene duration={8.4} className="flex items-center justify-center gap-16 px-20">
      <Reveal enter={[40, 400]} y={16} className="w-[560px]" exit="transition">
        {CHECKS.map((label, i) => {
          const resolve = RESOLVE[i];
          return (
            <div
              key={label}
              className="mb-6 flex items-center gap-5"
              style={{ animation: `caption-up 280ms ${i * 90}ms both` }}
            >
              <div className="relative h-12 w-12">
                {i === 0 ? (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ animation: `hide 80ms ${resolve - 80}ms both` }}
                  >
                    <Spinner />
                  </div>
                ) : (
                  <svg
                    width={48}
                    height={48}
                    className="absolute inset-0"
                    style={{ animation: `hide 80ms ${resolve}ms both` }}
                  >
                    <circle
                      cx="24"
                      cy="24"
                      r="18"
                      fill="none"
                      stroke="rgba(255,255,255,0.28)"
                      strokeWidth="3"
                      strokeDasharray="8 6"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
                <div className="absolute inset-0">
                  <Check delay={resolve} />
                </div>
              </div>
              <div
                className="text-3xl font-medium"
                style={{ animation: `brighten 200ms ${resolve}ms both` }}
              >
                {label}
              </div>
            </div>
          );
        })}
      </Reveal>
      <Reveal enter={[280, 640]} x={24} y={0} exit="transition">
        <Card className="relative h-[420px] w-[520px] overflow-hidden px-8 py-7">
          <div
            className="pointer-events-none absolute inset-y-0 w-20"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent)",
              animation: "sheen 1800ms 800ms ease-in-out both",
            }}
          />
          {LOG.map((line) => (
            <div
              key={line.text}
              className="text-xl leading-10"
              style={{
                color: line.done ? SUCCESS : "rgba(244,241,234,0.55)",
                animation: `code-reveal 280ms ${line.t}ms cubic-bezier(0.33,1,0.68,1) both`,
              }}
            >
              <Mono>
                {line.done ? (
                  <span className="inline-flex items-center gap-3">
                    <Check delay={5200} size={22} />
                    shipped
                  </span>
                ) : (
                  line.text
                )}
              </Mono>
            </div>
          ))}
        </Card>
      </Reveal>
    </Scene>
  );
}

function Artifact() {
  return (
    <Scene duration={6.4} className="flex flex-col items-center justify-center">
      <Reveal enter={[40, 320]} y={12} className="mb-12">
        <Chip delay={0} active>
          Shipped
        </Chip>
      </Reveal>
      <div
        className="flex items-center gap-6"
        style={{ animation: "artifact-pan 5.8s cubic-bezier(0.45,0,0.55,1) both" }}
      >
        {SCREENS.map((label, i) => (
          <div key={label} className="flex items-center gap-6">
            <Reveal enter={[280 + i * 280, 280 + i * 280 + 360]} y={20} scaleFrom={0.9}>
              <Card
                className="relative flex flex-col overflow-hidden"
                style={{ width: 220, height: 380 }}
              >
                <div className="h-8" style={{ background: SELECT }} />
                <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                  <div className="text-2xl font-semibold tracking-tight">{label}</div>
                  <div
                    className="mt-3 text-sm uppercase tracking-[0.14em]"
                    style={{ color: "rgba(244,241,234,0.45)" }}
                  >
                    CAN
                  </div>
                </div>
              </Card>
            </Reveal>
            {i < SCREENS.length - 1 ? (
              <div
                className="h-0.5 w-8 origin-left"
                style={{
                  background: "rgba(255,255,255,0.18)",
                  animation: `rule-draw-in 240ms ${520 + i * 280}ms both`,
                }}
              />
            ) : null}
          </div>
        ))}
      </div>
      <style>{`
        @keyframes artifact-pan {
          0%, 18% { transform: translateX(80px); }
          100% { transform: translateX(-40px); }
        }
      `}</style>
    </Scene>
  );
}
