import { ACCENT, Frame, INK, LINE, MUTED, Reveal, Solo, useAspect } from "../src/primitives";

const ROWS = [
  { label: "Brief", desc: "Opening copy and checks", vol: 427, pct: 72 },
  { label: "CAN", desc: "Product stills and SKU", vol: 312, pct: 60 },
  { label: "SKU", desc: "Catalog rows and price", vol: 201, pct: 56 },
  { label: "Checks", desc: "Resolve and deploy", vol: 149, pct: 48 },
  { label: "Studio", desc: "Drafts held in review", vol: 87, pct: 52 },
  { label: "Archive", desc: "Retired briefs", vol: 65, pct: 78 },
] as const;

const HDRS = ["Volume", "Rate", "Trend"] as const;

export const duration = 6;
export const aspect = "landscape" as const;

function Reel({ to, delay, suffix = "" }: { to: number; delay: number; suffix?: string }) {
  const values = [0, 0.35, 0.62, 0.84, 1].map((p) => Math.round(to * p));
  return (
    <div className="overflow-hidden" style={{ height: 36 }}>
      <div style={{ animation: `reel-up 720ms ${delay}ms cubic-bezier(0.33,1,0.68,1) both` }}>
        {values.map((v, i) => (
          <div key={i} className="tabular-nums" style={{ height: 36, lineHeight: "36px" }}>
            {v}
            {suffix}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <Table />
    </Solo>
  );
}

function Table() {
  const frame = useAspect();
  const stacked = frame !== "landscape";
  return (
    <Frame>
      <div className="measure">
        <Reveal enter={[80, 520]} y={28}>
          <div
            className={
              stacked
                ? "text-5xl font-semibold tracking-tight"
                : "text-6xl font-semibold tracking-tight"
            }
          >
            Deploy mix
          </div>
        </Reveal>
        {stacked ? null : (
          <div className="mt-10 flex gap-8 border-b pb-4" style={{ borderColor: LINE }}>
            <div className="flex-1" />
            {HDRS.map((h, i) => (
              <Reveal
                key={h}
                enter={[480 + i * 90, 680 + i * 90]}
                y={0}
                className="w-[18%] text-right"
              >
                <div
                  className="text-lg font-medium uppercase tracking-[0.12em]"
                  style={{ color: MUTED }}
                >
                  {h}
                </div>
              </Reveal>
            ))}
          </div>
        )}
        {ROWS.map((row, i) => (
          <Reveal key={row.label} enter={[900 + i * 140, 1180 + i * 140]} y={36}>
            <div
              className={`border-b ${stacked ? "py-4" : "flex items-center gap-8 py-5"}`}
              style={{ borderColor: LINE, color: INK }}
            >
              <div className={stacked ? "mb-3" : "flex-1"}>
                <div className={stacked ? "text-2xl font-medium" : "text-3xl font-medium"}>
                  {row.label}
                </div>
                <div className="mt-1 text-lg" style={{ color: MUTED }}>
                  {row.desc}
                </div>
              </div>
              <div className={stacked ? "flex justify-between gap-4 text-2xl" : "contents"}>
                <div className={stacked ? "" : "w-[18%] text-right text-3xl"}>
                  <Reel to={row.vol} delay={1100 + i * 140} />
                </div>
                <div
                  className={stacked ? "" : "w-[18%] text-right text-3xl"}
                  style={{ color: ACCENT }}
                >
                  <Reel to={row.pct} delay={1180 + i * 140} suffix="%" />
                </div>
                <div
                  className={stacked ? "" : "w-[18%] text-right text-3xl"}
                  style={{ color: row.pct >= 60 ? "#3d7a4a" : ACCENT }}
                >
                  {row.pct >= 56 ? "↑" : "↓"}
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
      <style>{`
        @keyframes reel-up {
          from { transform: translateY(0); }
          to { transform: translateY(-144px); }
        }
        ef-text-segment {
          display: inline-block;
          animation: reveal-in 400ms calc(var(--ef-stagger-offset, 0s)) cubic-bezier(0.33,1,0.68,1) both;
        }
      `}</style>
    </Frame>
  );
}
