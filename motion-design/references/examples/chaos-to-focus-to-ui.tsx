import type { CSSProperties } from "react";
import { Timegroup } from "@editframe/react";
import { ACCENT, Card, ExampleRoot, MUTED, NAVY, Reveal, Scene, Window } from "../src/primitives";

const OVERLAP = 0.4;
const CARDS = [
  { label: "Brief", meta: "OPEN", dx: "-640px", dy: "-260px", left: 120, top: 90, rot: "-14deg" },
  { label: "Checks", meta: "WAIT", dx: "520px", dy: "-300px", left: 1180, top: 70, rot: "9deg" },
  { label: "SKU", meta: "DRAFT", dx: "-700px", dy: "240px", left: 80, top: 620, rot: "7deg" },
  {
    label: "Deploy",
    meta: "NOW",
    dx: "0px",
    dy: "40px",
    left: 760,
    top: 340,
    rot: "-3deg",
    hero: true,
  },
  { label: "Review", meta: "HOLD", dx: "640px", dy: "280px", left: 1420, top: 640, rot: "-11deg" },
  { label: "Notes", meta: "LOG", dx: "-200px", dy: "-420px", left: 430, top: 40, rot: "5deg" },
  { label: "Asset", meta: "CAN", dx: "180px", dy: "380px", left: 980, top: 720, rot: "12deg" },
  { label: "Queue", meta: "12", dx: "-480px", dy: "80px", left: 250, top: 400, rot: "-8deg" },
];

export const duration = 12;
export const aspect = "landscape" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <ExampleRoot id={id} aspect={frame}>
      <Timegroup mode="sequence" overlap={OVERLAP} className="absolute inset-0">
        <Scene duration={3.5} className="relative" style={{ background: "#efeae0" }}>
          {CARDS.map((card, i) => (
            <div
              key={card.label}
              className="absolute"
              style={
                {
                  left: card.left,
                  top: card.top,
                  "--dx": card.dx,
                  "--dy": card.dy,
                  animation: `converge-in 640ms ${80 + i * 70}ms cubic-bezier(0.33,1,0.68,1) both`,
                } as CSSProperties
              }
            >
              <Card
                className="px-7 py-6"
                style={{
                  width: card.hero ? 280 : 220,
                  transform: `rotate(${card.rot})`,
                  outline: card.hero ? `2px solid ${ACCENT}` : undefined,
                }}
              >
                <div className="text-sm uppercase tracking-[0.14em]" style={{ color: MUTED }}>
                  {card.meta}
                </div>
                <div className="mt-2 text-3xl font-semibold tracking-tight">{card.label}</div>
              </Card>
            </div>
          ))}
        </Scene>

        <Scene
          duration={2.4}
          className="relative overflow-hidden"
          style={{ background: "#efeae0" }}
        >
          <div
            className="absolute inset-0"
            style={{ animation: "smash-zoom 900ms cubic-bezier(0.32,0,0.67,0) both" }}
          >
            <div className="absolute" style={{ left: 760, top: 340 }}>
              <Card className="px-7 py-6" style={{ width: 280, outline: `2px solid ${ACCENT}` }}>
                <div className="text-sm uppercase tracking-[0.14em]" style={{ color: MUTED }}>
                  NOW
                </div>
                <div className="mt-2 text-3xl font-semibold tracking-tight">Deploy</div>
              </Card>
            </div>
          </div>
          <div
            className="absolute inset-0"
            style={{ background: "#fff", animation: "smash-flash 900ms linear both" }}
          />
          <style>{`
            @keyframes smash-zoom {
              from { transform: scale(1); }
              to { transform: scale(7.4); }
            }
            @keyframes smash-flash {
              0%, 35% { opacity: 0; }
              48% { opacity: 0.92; }
              70%, 100% { opacity: 0; }
            }
          `}</style>
        </Scene>

        <Scene
          duration={6.9}
          className="flex items-center justify-center"
          style={{ background: NAVY }}
        >
          <div
            className="absolute inset-0"
            style={{ background: NAVY, animation: "fade-in 280ms both" }}
          />
          <Reveal enter={[40, 480]} y={16} exit="transition">
            <Window title="queue" width={1280} height={700}>
              <div className="h-full px-10 py-8">
                <div className="mb-6 text-sm uppercase tracking-[0.16em]" style={{ color: MUTED }}>
                  Open
                </div>
                {["Deploy CAN to prod", "Attach SKU 01", "Run checks", "Notify brief"].map(
                  (row, i) => (
                    <div
                      key={row}
                      className="mb-3 flex items-center justify-between rounded-xl px-6 py-4"
                      style={{
                        background: i === 0 ? `${ACCENT}33` : "#1e1d1b",
                        border: `1px solid ${i === 0 ? ACCENT : "#2c2a26"}`,
                        animation: `tile-reveal 280ms ${220 + i * 120}ms cubic-bezier(0.33,1,0.68,1) both`,
                      }}
                    >
                      <span className="text-2xl">{row}</span>
                      <span className="font-mono text-sm" style={{ color: MUTED }}>
                        {i === 0 ? "NOW" : "WAIT"}
                      </span>
                    </div>
                  ),
                )}
              </div>
            </Window>
          </Reveal>
        </Scene>
      </Timegroup>
    </ExampleRoot>
  );
}
