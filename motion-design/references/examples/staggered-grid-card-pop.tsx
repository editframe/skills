import { ACCENT, Card, MUTED, NAVY, Reveal, Solo } from "../src/primitives";

export const duration = 4;
export const aspect = "landscape" as const;

const CARDS = [
  { title: "Checks", value: "98%", x: 200, y: 140 },
  { title: "Deploy", value: "12", x: 1000, y: 140 },
  { title: "SKU", value: "04", x: 200, y: 560 },
  { title: "Route", value: "3.2", x: 1000, y: 560 },
];

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      {CARDS.map((card, i) => (
        <Reveal
          key={card.title}
          enter={[180 + i * 80, 180 + i * 80 + 240]}
          y={16}
          scaleFrom={0.86}
          className="absolute"
          style={{ left: card.x, top: card.y, width: 720, height: 380 }}
        >
          <Card className="flex h-full flex-col justify-between p-12">
            <div
              className="text-sm font-semibold uppercase tracking-[0.16em]"
              style={{ color: MUTED }}
            >
              {card.title}
            </div>
            <div
              className="text-8xl font-semibold tracking-tight"
              style={{ color: i === 0 ? NAVY : undefined }}
            >
              {card.value}
            </div>
            <div className="flex gap-2">
              {[0, 1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="h-2 flex-1 rounded-full"
                  style={{ background: n < 3 ? ACCENT : "#e6dfd4" }}
                />
              ))}
            </div>
          </Card>
        </Reveal>
      ))}
    </Solo>
  );
}
