import { ACCENT, Reveal, Solo, DisplayText } from "../src/primitives";

const TICKS = [
  { n: "55%", cls: "p55" },
  { n: "56%", cls: "p56" },
  { n: "57%", cls: "p57" },
  { n: "58%", cls: "p58" },
  { n: "59%", cls: "p59" },
  { n: "60%", cls: "p60" },
];

export const duration = 4;
export const aspect = "landscape" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <div className="flex h-full w-full flex-col items-center justify-center">
        <Reveal enter={[0, 280]} y={0}>
          <DisplayText size={72}>Deploy complete</DisplayText>
        </Reveal>
        <div className="mt-6 flex items-baseline text-7xl font-medium tracking-tight">
          <span className="word-at">at</span>
          <span className="relative mx-5 inline-block" style={{ color: ACCENT, minWidth: "3.2ch" }}>
            <span className="opacity-0">60%</span>
            {TICKS.map((tick) => (
              <span key={tick.n} className={`absolute left-0 top-0 ${tick.cls}`}>
                {tick.n}
              </span>
            ))}
          </span>
          <span className="word-lower">lower</span>
          <span className="word-cost ml-5">cost</span>
        </div>
      </div>
      <style>{`
        .p55 { animation: p55 4000ms linear both; }
        .p56 { animation: p56 4000ms linear both; }
        .p57 { animation: p57 4000ms linear both; }
        .p58 { animation: p58 4000ms linear both; }
        .p59 { animation: p59 4000ms linear both; }
        .p60 { animation: p60 4000ms linear both; }
        .word-at { animation: word-at 4000ms linear both; }
        .word-lower { animation: word-lower 4000ms linear both; }
        .word-cost { animation: word-cost 4000ms linear both; }
        @keyframes p55 {
          0%, 32.4% { opacity: 0; }
          32.5%, 37.4% { opacity: 1; }
          37.5%, 100% { opacity: 0; }
        }
        @keyframes p56 {
          0%, 37.4% { opacity: 0; }
          37.5%, 41.1% { opacity: 1; }
          41.2%, 100% { opacity: 0; }
        }
        @keyframes p57 {
          0%, 41.1% { opacity: 0; }
          41.2%, 44.8% { opacity: 1; }
          44.9%, 100% { opacity: 0; }
        }
        @keyframes p58 {
          0%, 44.8% { opacity: 0; }
          44.9%, 48.5% { opacity: 1; }
          48.6%, 100% { opacity: 0; }
        }
        @keyframes p59 {
          0%, 48.5% { opacity: 0; }
          48.6%, 52.2% { opacity: 1; }
          52.3%, 100% { opacity: 0; }
        }
        @keyframes p60 {
          0%, 52.2% { opacity: 0; }
          52.3%, 100% { opacity: 1; }
        }
        @keyframes word-at {
          0%, 18% { opacity: 0; }
          18.1%, 100% { opacity: 1; }
        }
        @keyframes word-lower {
          0%, 50% { opacity: 0; }
          50.1%, 100% { opacity: 1; }
        }
        @keyframes word-cost {
          0%, 58% { opacity: 0; }
          58.1%, 100% { opacity: 1; }
        }
      `}</style>
    </Solo>
  );
}
