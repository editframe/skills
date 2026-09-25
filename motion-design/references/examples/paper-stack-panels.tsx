import { Card, Check, Chip, LINE, MUTED, Solo, Window } from "../src/primitives";

export const duration = 5;
export const aspect = "landscape" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <div className="absolute inset-0" style={{ animation: "paper-unified 5s linear both" }}>
        <div className="flex h-full w-full items-center justify-center">
          <Window title="workspace / env" width={1280} height={720}>
            <div className="flex h-full">
              <div
                className="w-[480px] border-r p-8"
                style={{ borderColor: LINE, background: "#1a1917" }}
              >
                <Chip delay={80}>Brief</Chip>
                <div className="mt-6 text-lg leading-relaxed" style={{ color: MUTED }}>
                  Set up the workspace. Run checks. Save the environment.
                </div>
              </div>
              <div className="flex-1 p-8">
                <div className="text-2xl font-semibold">project-main</div>
                <div className="mt-6 space-y-3 font-mono text-sm" style={{ color: MUTED }}>
                  <div>pnpm install</div>
                  <div>pnpm --filter web build</div>
                  <div>pnpm --filter api db:seed</div>
                </div>
              </div>
            </div>
          </Window>
        </div>
      </div>

      <div className="absolute inset-0" style={{ animation: "paper-left 5s linear both" }}>
        <Card className="absolute p-8" style={{ left: 180, top: 180, width: 520, height: 720 }}>
          <Chip delay={0}>Brief</Chip>
          <div className="mt-8 text-3xl font-semibold">Environment</div>
          <div className="mt-4 text-lg leading-relaxed" style={{ color: MUTED }}>
            Clone the repo. Configure secrets. Install deps.
          </div>
          <div className="mt-10 flex gap-3">
            <Chip delay={0}>Preview</Chip>
            <Chip delay={80}>Save</Chip>
          </div>
        </Card>
      </div>

      <div className="absolute inset-0" style={{ animation: "paper-right 5s linear both" }}>
        <Card className="absolute p-8" style={{ left: 620, top: 180, width: 760, height: 720 }}>
          <div className="flex items-center justify-between">
            <div className="text-3xl font-semibold">project-main</div>
            <Chip delay={0} active>
              Ready
            </Chip>
          </div>
          <div className="mt-8 space-y-4 font-mono text-base" style={{ color: MUTED }}>
            <div>AWS_ACCESS_KEY_ID · Team</div>
            <div>DATABASE_URL · Personal</div>
            <div>REDIS_URL · Personal</div>
          </div>
        </Card>
      </div>

      <div
        className="absolute"
        style={{ left: 1180, top: 240, animation: "paper-float-a 5s linear both" }}
      >
        <Card className="w-[520px] p-6">
          <div className="mb-3 flex items-center gap-3">
            <Check delay={2850} size={28} />
            <span className="font-semibold">Run checks</span>
          </div>
          <div className="font-mono text-sm" style={{ color: MUTED }}>
            PASS billing.test.ts
            <br />
            PASS usage.test.ts
          </div>
        </Card>
      </div>

      <div
        className="absolute"
        style={{ left: 1100, top: 620, animation: "paper-float-b 5s linear both" }}
      >
        <Card className="w-[560px] p-6">
          <div className="mb-3 font-semibold">Opened console</div>
          <div className="space-y-2 text-sm" style={{ color: MUTED }}>
            <div>Inspect service health</div>
            <div>Read the spend graphs</div>
          </div>
        </Card>
      </div>

      <style>{`
        @keyframes paper-unified {
          0% { opacity: 0; }
          12% { opacity: 1; }
          19.9% { opacity: 1; }
          20% { opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes paper-left {
          0%, 19.9% { opacity: 0; transform: translateX(-80px); }
          20% { opacity: 1; transform: translateX(-80px); }
          56% { transform: translateX(120px); }
          84% { transform: translateX(120px); }
          100% { transform: translateX(1600px); }
        }
        @keyframes paper-right {
          0%, 19.9% { opacity: 0; transform: translateX(80px); }
          20% { opacity: 1; transform: translateX(80px); }
          56% { transform: translateX(-140px); }
          84% { transform: translateX(-140px); }
          100% { transform: translateX(1600px); }
        }
        @keyframes paper-float-a {
          0%, 56% { opacity: 0; transform: translateY(24px); }
          63% { opacity: 1; transform: translateY(0); }
          84% { transform: translateY(0); }
          100% { transform: translateX(1400px); }
        }
        @keyframes paper-float-b {
          0%, 60% { opacity: 0; transform: translateY(24px); }
          67% { opacity: 1; transform: translateY(0); }
          84% { transform: translateY(0); }
          100% { transform: translateX(1400px); }
        }
      `}</style>
    </Solo>
  );
}
