import { Card, Check, Chip, Reveal, Solo } from "../src/primitives";

const ROWS = [
  "Restore syncing",
  "Fix overlap",
  "Align spacing",
  "Two-pass input",
  "Audit navigation",
  "Bulk delete",
];
const AGENTS = ["Studio", "Checks", "Draft"];
const SELECT = 520;
const MODAL_IN = 900;
const PICK = 1680;
const SETTLE = 2400;
const MODAL_OUT = 2280;

export const duration = 5;
export const aspect = "landscape" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <div className="flex h-full w-full items-center justify-center">
        <div className="relative w-[min(820px,var(--measure))]">
          <Reveal enter={[0, 360]} y={16}>
            <Card className="overflow-hidden p-3">
              {ROWS.map((title) => (
                <div key={title} className="flex items-center gap-5 px-5 py-4">
                  <div className="relative h-10 w-10">
                    <div
                      className="absolute inset-0 rounded-md"
                      style={{
                        border: "2px solid #d4cdc0",
                        animation: `hide 80ms ${SELECT}ms both`,
                      }}
                    />
                    <div className="absolute inset-0">
                      <Check delay={SELECT} size={40} />
                    </div>
                  </div>
                  <div className="flex-1 text-2xl font-medium">{title}</div>
                  <div
                    className="opacity-0"
                    style={{
                      animation: `check-pop 220ms ${SETTLE}ms cubic-bezier(0.34,1.56,0.64,1) both`,
                    }}
                  >
                    <Chip delay={0} active>
                      Checks
                    </Chip>
                  </div>
                </div>
              ))}
            </Card>
          </Reveal>
          <div
            className="absolute left-8 right-8 top-10"
            style={{
              animation: [
                `slam 280ms ${MODAL_IN}ms cubic-bezier(0.33,1,0.68,1) both`,
                `hide 160ms ${MODAL_OUT}ms forwards`,
              ].join(", "),
            }}
          >
            <Card className="p-8 shadow-2xl">
              <div className="mb-6 flex items-center gap-4">
                <Chip delay={0}>6 issues</Chip>
                <div className="text-2xl font-medium">Assign to…</div>
              </div>
              {AGENTS.map((name) => (
                <div
                  key={name}
                  className="flex items-center gap-4 rounded-xl px-4 py-3"
                  style={
                    name === "Checks"
                      ? { animation: `pick-flash 360ms ${PICK}ms cubic-bezier(0.33,1,0.68,1) both` }
                      : undefined
                  }
                >
                  <Chip delay={0} active={name === "Checks"}>
                    {name}
                  </Chip>
                </div>
              ))}
            </Card>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes pick-flash {
          0% { background: transparent; }
          40% { background: rgba(30, 58, 138, 0.16); }
          100% { background: rgba(30, 58, 138, 0.08); }
        }
      `}</style>
    </Solo>
  );
}
