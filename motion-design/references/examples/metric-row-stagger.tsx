import { Card, Mono, Reveal, Solo } from "../src/primitives";

const ROWS = [
  { label: "Checks", volume: "427", rate: "72%" },
  { label: "Deploy", volume: "312", rate: "60%" },
  { label: "Brief", volume: "201", rate: "56%" },
  { label: "SKU", volume: "149", rate: "48%" },
  { label: "CAN", volume: "87", rate: "52%" },
];

export const duration = 4;
export const aspect = "landscape" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <div className="flex h-full w-full items-center justify-center">
        <div className="w-[min(880px,var(--measure))]">
          <Reveal enter={[80, 420]} y={12} className="mb-8 text-4xl font-semibold tracking-tight">
            Account checks
          </Reveal>
          {ROWS.map((row, i) => (
            <Reveal key={row.label} enter={[360 + i * 80, 720 + i * 80]} y={36}>
              <Card className="mb-3 flex items-center gap-8 px-8 py-5">
                <div className="w-[220px] text-2xl font-medium">{row.label}</div>
                <Mono className="w-[120px] text-2xl">{row.volume}</Mono>
                <Mono className="text-2xl">{row.rate}</Mono>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </Solo>
  );
}
