import { Text as EfText } from "@editframe/react";
import { Card, Chip, MUTED, Solo } from "../src/primitives";
import type { ReactElement, ReactNode } from "react";

const Text = EfText as unknown as (props: {
  split?: string;
  stagger?: string;
  className?: string;
  children?: ReactNode;
}) => ReactElement;

const CARDS = [
  { x: 190, y: 220, s: 0.52, r: -4, delay: 180, sku: "01", spend: "$18" },
  { x: 520, y: 200, s: 0.5, r: 3, delay: 320, sku: "02", spend: "$42" },
  { x: 1420, y: 210, s: 0.51, r: -2, delay: 460, sku: "03", spend: "$8" },
  { x: 1720, y: 230, s: 0.48, r: 5, delay: 600, sku: "04", spend: "$26" },
  { x: 240, y: 620, s: 0.48, r: 3, delay: 740, sku: "05", spend: "$5" },
  { x: 540, y: 780, s: 0.5, r: -5, delay: 880, sku: "06", spend: "$71" },
  { x: 1400, y: 790, s: 0.48, r: 3, delay: 1020, sku: "07", spend: "$15" },
  { x: 1700, y: 610, s: 0.5, r: -4, delay: 1160, sku: "08", spend: "$33" },
];

function Slip({ sku, spend }: { sku: string; spend: string }) {
  return (
    <Card className="h-[280px] w-[380px] p-6">
      <div className="flex items-center justify-between border-b pb-3">
        <span className="text-sm font-semibold tracking-wide">SKU {sku}</span>
        <Chip delay={0}>Brief</Chip>
      </div>
      <div className="mt-6 flex justify-between text-lg" style={{ color: MUTED }}>
        <span>Checks</span>
        <span>4</span>
      </div>
      <div className="mt-3 flex justify-between text-lg">
        <span>Spend</span>
        <span className="font-semibold">{spend}</span>
      </div>
    </Card>
  );
}

export const duration = 4;
export const aspect = "landscape" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <div className="absolute left-0 right-0 top-16 text-center"></div>

      {CARDS.map((card) => (
        <div
          key={card.sku}
          className="absolute"
          style={{
            left: card.x,
            top: card.y,
            marginLeft: -190,
            marginTop: -140,
            transform: `rotate(${card.r}deg) scale(${card.s})`,
          }}
        >
          <div
            style={{
              animation: `invoice-enter 520ms ${card.delay}ms cubic-bezier(0.33,1,0.68,1) both`,
            }}
          >
            <Slip sku={card.sku} spend={card.spend} />
          </div>
        </div>
      ))}

      <div
        className="absolute left-1/2 top-1/2"
        style={{
          marginLeft: -250,
          marginTop: -160,
          animation: "invoice-hero 700ms 1680ms cubic-bezier(0.33,1,0.68,1) both",
          zIndex: 8,
        }}
      >
        <Card
          className="h-[340px] w-[500px] p-8"
          style={{ boxShadow: "0 32px 70px rgba(26,26,26,0.16)" }}
        >
          <div className="flex items-center justify-between border-b pb-4">
            <span className="text-xl font-semibold tracking-wide">SKU 00</span>
            <Chip delay={0} active>
              Hero
            </Chip>
          </div>
          <div className="mt-8 flex justify-between text-2xl" style={{ color: MUTED }}>
            <span>Checks</span>
            <span>12</span>
          </div>
          <div className="mt-4 flex justify-between text-3xl font-semibold">
            <span>Spend</span>
            <span>$93</span>
          </div>
        </Card>
      </div>

      <style>{`
        .invoice-title {
          font-size: 56px;
          font-weight: 700;
          letter-spacing: -0.04em;
        }
        .invoice-title ef-text-segment[data-active] {
          animation: caption-up 380ms both;
        }
        @keyframes invoice-enter {
          from { opacity: 0; transform: translateY(36px) scale(0.72); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes invoice-hero {
          from { opacity: 0; transform: translateY(40px) scale(0.86); }
          to { opacity: 1; transform: translateY(0) scale(1.08); }
        }
      `}</style>
    </Solo>
  );
}
