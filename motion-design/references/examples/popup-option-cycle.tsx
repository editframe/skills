import { ACCENT, Card, Check, Chip, MUTED, NAVY, Reveal, Solo } from "../src/primitives";

const OPTIONS = [
  { label: "Brief", color: ACCENT, cls: "opt-0" },
  { label: "Deploy", color: "#3d7a4a", cls: "opt-1" },
  { label: "Checks", color: NAVY, cls: "opt-2" },
];

export const duration = 4;
export const aspect = "landscape" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <div className="flex h-full w-full items-center justify-center gap-10">
        <Reveal enter={[0, 220]} y={0} scaleFrom={1.06}>
          <Card className="flex h-[96px] w-[360px] items-center justify-between px-8">
            <span className="text-3xl font-medium">Auto</span>
            <Check delay={80} size={32} />
          </Card>
        </Reveal>

        <Reveal enter={[420, 720]} y={18}>
          <Card className="relative h-[340px] w-[480px] p-8">
            <div className="mb-6 text-xl" style={{ color: MUTED }}>
              Optimize for
            </div>
            {OPTIONS.map((opt, i) => (
              <div key={opt.label} className="relative mb-3 h-[64px]">
                <div
                  className={`absolute inset-0 rounded-2xl ${opt.cls}`}
                  style={{ background: "#efeae0" }}
                />
                <div className="relative flex h-full items-center justify-between px-5">
                  <span className="relative text-3xl font-medium">
                    <span className={`${opt.cls}-ink`} style={{ color: "#1a1a1a" }}>
                      {opt.label}
                    </span>
                    <span
                      className={`absolute inset-0 flex items-center ${opt.cls}`}
                      style={{ color: opt.color }}
                    >
                      {opt.label}
                    </span>
                  </span>
                  <div className={opt.cls}>
                    <Check delay={0} size={28} />
                  </div>
                </div>
              </div>
            ))}
            <div className="absolute bottom-6 right-8">
              <Chip delay={500}>sku auto</Chip>
            </div>
          </Card>
        </Reveal>
      </div>

      <style>{`
        .opt-0 { animation: opt-0 4000ms linear both; }
        .opt-1 { animation: opt-1 4000ms linear both; }
        .opt-2 { animation: opt-2 4000ms linear both; }
        .opt-0-ink { animation: opt-0-ink 4000ms linear both; }
        .opt-1-ink { animation: opt-1-ink 4000ms linear both; }
        .opt-2-ink { animation: opt-2-ink 4000ms linear both; }
        @keyframes opt-0 {
          0% { opacity: 1; }
          32.4% { opacity: 1; }
          32.5% { opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes opt-1 {
          0% { opacity: 0; }
          32.4% { opacity: 0; }
          32.5% { opacity: 1; }
          54.9% { opacity: 1; }
          55% { opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes opt-2 {
          0% { opacity: 0; }
          54.9% { opacity: 0; }
          55% { opacity: 1; }
          100% { opacity: 1; }
        }
        @keyframes opt-0-ink {
          0% { opacity: 0; }
          32.4% { opacity: 0; }
          32.5% { opacity: 1; }
          100% { opacity: 1; }
        }
        @keyframes opt-1-ink {
          0% { opacity: 1; }
          32.4% { opacity: 1; }
          32.5% { opacity: 0; }
          54.9% { opacity: 0; }
          55% { opacity: 1; }
          100% { opacity: 1; }
        }
        @keyframes opt-2-ink {
          0% { opacity: 1; }
          54.9% { opacity: 1; }
          55% { opacity: 0; }
          100% { opacity: 0; }
        }
      `}</style>
    </Solo>
  );
}
