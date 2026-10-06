import { Card, Chip, MUTED, Reveal, Solo } from "../src/primitives";

const CARDS = [
  { year: "2026", title: "Brief 01", body: "Touch sensation, mapped." },
  { year: "2025", title: "Brief 02", body: "Energy density, held." },
  { year: "2024", title: "Brief 03", body: "Causal forests, scored." },
  { year: "2024", title: "Brief 04", body: "Response markers, read." },
  { year: "2025", title: "Brief 05", body: "Long context, sparse." },
];

export const duration = 5;
export const aspect = "landscape" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <Reveal enter={[0, 360]} y={12} className="absolute left-16 top-14">
        <Chip delay={0}>deck</Chip>
      </Reveal>
      <div className="flex h-full w-full items-center justify-center" style={{ perspective: 1400 }}>
        <div className="relative h-[520px] w-[min(720px,var(--measure))]">
          {CARDS.map((card, i) => (
            <div
              key={card.title}
              className="absolute left-0 right-0"
              style={{
                animation: `deck-depth 5s linear ${-i}s both`,
                transformOrigin: "50% 50%",
              }}
            >
              <Card className="px-10 py-9" style={{ boxShadow: "0 28px 60px rgba(26,26,26,0.12)" }}>
                <Chip delay={0}>{card.year}</Chip>
                <div className="mt-5 text-4xl font-semibold tracking-tight">{card.title}</div>
                <div className="mt-3 text-xl" style={{ color: MUTED }}>
                  {card.body}
                </div>
              </Card>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes deck-depth {
          0%   { transform: translateY(-340px) scale(0.62); opacity: 0; z-index: 1; }
          12%  { transform: translateY(-180px) scale(0.78); opacity: 0.5; z-index: 2; }
          32%  { transform: translateY(0) scale(1); opacity: 1; z-index: 5; }
          52%  { transform: translateY(200px) scale(0.8); opacity: 0.45; z-index: 3; }
          72%  { transform: translateY(400px) scale(0.58); opacity: 0; z-index: 1; }
          100% { transform: translateY(-340px) scale(0.62); opacity: 0; z-index: 1; }
        }
      `}</style>
    </Solo>
  );
}
