import { Card, Chip, Reveal, Solo, Window, DisplayText } from "../src/primitives";

export const duration = 5;
export const aspect = "landscape" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <div className="flex h-full w-full items-center justify-center">
        <div style={{ animation: "chrome-out 480ms 1400ms cubic-bezier(0.32,0,0.67,0) forwards" }}>
          <Window title="draft" width={920} height={560}>
            <div className="flex h-full items-end p-10">
              <Card className="w-[520px] p-8">
                <Chip delay={200}>Draft</Chip>
                <div className="mt-4 text-2xl font-medium">
                  An operations brief that surfaces decisions.
                </div>
                <div className="mt-6">
                  <Chip delay={360} active>
                    Publish
                  </Chip>
                </div>
              </Card>
            </div>
          </Window>
        </div>
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ animation: "hero-cross 520ms 1500ms cubic-bezier(0.33,1,0.68,1) both" }}
        >
          <div style={{ animation: "hero-rect 720ms 1500ms cubic-bezier(0.45,0,0.55,1) both" }}>
            <Card className="flex h-full flex-col justify-end p-12">
              <Reveal enter={[2100, 2580]} y={16}>
                <DisplayText size={48}>THE IDEA</DisplayText>
              </Reveal>
              <Reveal
                enter={[2300, 2780]}
                y={14}
                className="mt-3 text-2xl"
                style={{ color: "#6f6860" }}
              >
                Surfaces decisions that need a check.
              </Reveal>
              <Reveal enter={[2520, 3000]} y={10} className="mt-8">
                <Chip delay={0} active>
                  Deploy
                </Chip>
              </Reveal>
            </Card>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes chrome-out {
          to { opacity: 0; transform: scale(0.98); }
        }
        @keyframes hero-cross {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes hero-rect {
          from { width: 520px; height: 280px; }
          to { width: 720px; height: 520px; }
        }
      `}</style>
    </Solo>
  );
}
