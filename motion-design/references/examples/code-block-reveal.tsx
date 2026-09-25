import { ACCENT, Card, MUTED, Reveal, Solo, Window, Mono } from "../src/primitives";

export const duration = 5;
export const aspect = "landscape" as const;

const LINES = [
  { text: "# Deploy after checks", comment: true },
  { text: 'run("ship", {', comment: false },
  { text: '  sku: "01",', comment: false },
  { text: '  env: "prod",', comment: false },
  { text: "})", comment: false },
];

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <div className="flex h-full w-full items-center justify-center">
        <Reveal enter={[0, 520]} y={20}>
          <Card className="w-[min(1100px,var(--measure))] p-12">
            <div className="text-2xl font-medium">
              Fix deploy path: <Mono>scripts/ship.ts</Mono>
            </div>
            <Reveal enter={[700, 1400]} y={10} className="relative mt-5 text-xl">
              Replaced the patch with{" "}
              <span className="relative inline-block">
                after checks pass
                <span
                  className="absolute left-0 top-full mt-1 h-[3px] w-full"
                  style={{
                    background: ACCENT,
                    transformOrigin: "0 50%",
                    animation: "underline-draw 400ms 3000ms cubic-bezier(0.33,1,0.68,1) both",
                  }}
                />
              </span>
              .
            </Reveal>
            <div className="mt-8">
              <Window title="ship.ts" width={1004} height={280}>
                <div
                  className="h-full px-8 py-6"
                  style={{ animation: "code-reveal 700ms 1400ms cubic-bezier(0.33,1,0.68,1) both" }}
                >
                  {LINES.map((line) => (
                    <div
                      key={line.text}
                      className="leading-8"
                      style={{ color: line.comment ? "#3d7a4a" : "#f3efe6" }}
                    >
                      <Mono className="text-[22px]">{line.text}</Mono>
                    </div>
                  ))}
                </div>
              </Window>
            </div>
          </Card>
        </Reveal>
      </div>
    </Solo>
  );
}
