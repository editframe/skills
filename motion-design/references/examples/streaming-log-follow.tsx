import { Check, Mono, Reveal, Solo, Window } from "../src/primitives";

const MS_PER_CHAR = 8;
const LINES = [
  { text: "$ npm run prepare -- --sku 01", color: "#f3efe6", gap: 40 },
  { text: "Scanning workspace...", color: "#8a847c", gap: 40 },
  { text: "Collecting context from the brief.", color: "#c8c2b8", gap: 80 },
  { text: "list_dir {'.'}", color: "#3d7a4a", gap: 20 },
  { text: "read_file {'brief.md'}", color: "#3d7a4a", gap: 20 },
  { text: "read_file {'sku.json'}", color: "#3d7a4a", gap: 80 },
  { text: "Looking at routes and models.", color: "#c8c2b8", gap: 80 },
  { text: "list_dir {'src'}", color: "#3d7a4a", gap: 20 },
  { text: "read_file {'src/Video.tsx'}", color: "#3d7a4a", gap: 20 },
  { text: "read_file {'src/routes.ts'}", color: "#3d7a4a", gap: 80 },
  { text: "Writing the catalog entry now.", color: "#c8c2b8", gap: 120 },
  { text: "Wrote brief.md: purpose, components, tooling.", color: "#c8c2b8", gap: 80 },
  { text: "$", color: "#8a847c", gap: 0 },
] as const;

const TIMINGS = (() => {
  let t = 120;
  return LINES.map((line) => {
    const start = t;
    const typed = Math.max(line.text.length * MS_PER_CHAR, 40);
    t = start + typed + line.gap;
    return { start, typed };
  });
})();

export const duration = 6;
export const aspect = "landscape" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <div className="flex h-full w-full items-center justify-center">
        <Reveal enter={[0, 280]} y={12}>
          <Window title="workspace · sample session" width={1120} height={620}>
            <div className="relative h-full overflow-hidden px-8 py-6">
              <div
                style={{
                  animation: "log-follow 6s cubic-bezier(0.33,1,0.68,1) both",
                }}
              >
                {LINES.map((line, i) => {
                  const { start, typed } = TIMINGS[i];
                  return (
                    <div
                      key={line.text + i}
                      style={{ minHeight: 38, fontSize: 22, color: line.color }}
                    >
                      <span className="inline-block" style={{ width: `${line.text.length}ch` }}>
                        <span
                          className="inline-block overflow-hidden whitespace-nowrap"
                          style={{
                            animation: `typewriter-reveal ${typed}ms steps(${Math.max(line.text.length, 1)}, end) ${start}ms both`,
                          }}
                        >
                          <Mono>{line.text}</Mono>
                        </span>
                      </span>
                    </div>
                  );
                })}
                <div
                  className="mt-3 inline-flex items-center gap-3 rounded-md px-4 py-3"
                  style={{
                    border: "1px solid #2c2a26",
                    animation: "fade-in 160ms 4200ms both",
                  }}
                >
                  <Check delay={4280} size={28} />
                  <Mono className="text-lg">Saved brief</Mono>
                </div>
              </div>
            </div>
          </Window>
        </Reveal>
      </div>
      <style>{`
        @keyframes log-follow {
          0%, 38% { transform: translateY(0); }
          100% { transform: translateY(-220px); }
        }
      `}</style>
    </Solo>
  );
}
