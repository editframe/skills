import { Timegroup } from "@editframe/react";
import { Card, ExampleRoot, LINE, PANEL, ProductCan, Reveal, Scene } from "../src/primitives";

export const duration = 4.5;
export const aspect = "portrait" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <ExampleRoot id={id} aspect={frame}>
      <Timegroup mode="sequence" overlap={0.7} className="absolute inset-0">
        <Scene duration={3.2}>
          <div className="flex h-full w-full flex-col items-center justify-center">
            <div
              className="relative overflow-hidden"
              style={{
                width: 480,
                height: 560,
                background: PANEL,
                borderRadius: 36,
                border: `1px solid ${LINE}`,
                animation: [
                  "tile-grow 720ms 120ms cubic-bezier(0.33,1,0.68,1) both",
                  "tile-to-well var(--ef-transition-duration) var(--ef-transition-out-start) cubic-bezier(0.45,0,0.55,1) forwards",
                ].join(", "),
              }}
            >
              <div className="flex h-full flex-col items-center justify-center">
                <Reveal enter={[280, 900]} y={24} scaleFrom={0.9} exit="transition">
                  <div
                    style={{ animation: "bob 3s ease-in-out infinite", animationDelay: "-0.6s" }}
                  >
                    <ProductCan label="01" name="SPARK" color="#1a1210" size="hero" height={440} />
                  </div>
                </Reveal>
              </div>
            </div>
            <Reveal
              enter={[700, 1180]}
              y={16}
              exit="transition"
              className="mt-12 text-center"
            ></Reveal>
          </div>
        </Scene>
        <Scene duration={2}>
          <div className="flex h-full w-full flex-col items-center justify-center">
            <div
              className="relative overflow-hidden"
              style={{
                width: 840,
                height: 1180,
                background: PANEL,
                borderRadius: 16,
                border: `1px solid ${LINE}`,
                animation: "fade-in 400ms 80ms both",
              }}
            >
              <div
                className="absolute inset-4 rounded-xl"
                style={{ border: "1px solid rgba(26,26,26,0.12)" }}
              />
              <div className="flex h-full items-center justify-center">
                <ProductCan label="01" name="SPARK" color="#1a1210" size="hero" />
              </div>
            </div>
            <Reveal enter={[200, 620]} y={12} className="mt-10">
              <Card className="px-6 py-3 text-xl font-medium">Well</Card>
            </Reveal>
          </div>
        </Scene>
      </Timegroup>
      <style>{`
        @keyframes tile-grow {
          from { transform: scale(0.72); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes tile-to-well {
          to {
            width: 840px;
            height: 1180px;
            border-radius: 16px;
          }
        }
      `}</style>
    </ExampleRoot>
  );
}
