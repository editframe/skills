import { Timegroup } from "@editframe/react";
import { ExampleRoot, GOLD, StudyMarker, Reveal, Scene, DisplayText } from "../src/primitives";

const OVERLAP = 0.4;

export const duration = 12;
export const aspect = "landscape" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <ExampleRoot id={id} aspect={frame} theme="saas">
      <Timegroup mode="sequence" overlap={OVERLAP} className="absolute inset-0">
        <Scene duration={6.5} className="flex items-center justify-center">
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at 42% 58%, ${GOLD}22, transparent 58%)`,
            }}
          />
          <div className="relative flex items-end gap-6" style={{ height: 280 }}>
            <div style={{ animation: "mark-hop 2.8s cubic-bezier(0.33,1,0.68,1) both" }}>
              <div style={{ animation: "bob 2.6s ease-in-out 2.8s infinite" }}>
                <StudyMarker letter="01" size={168} />
              </div>
            </div>
            <div
              style={{
                animation: "stack-drop 700ms 3200ms cubic-bezier(0.34,1.56,0.64,1) both",
              }}
            >
              <div
                className="flex items-center justify-center rounded-full font-semibold text-white"
                style={{
                  width: 92,
                  height: 92,
                  background: GOLD,
                  color: "#14110e",
                  fontSize: 38,
                  opacity: 0.92,
                  boxShadow: "0 18px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.35)",
                }}
              >
                02
              </div>
            </div>
          </div>
          <style>{`
            @keyframes mark-hop {
              0% { transform: translate(-420px, 90px) rotate(-18deg); }
              22% { transform: translate(-220px, -56px) rotate(10deg); }
              40% { transform: translate(-40px, 28px) rotate(-8deg); }
              58% { transform: translate(70px, -48px) rotate(8deg); }
              76% { transform: translate(0, 0) rotate(0deg); }
              100% { transform: translate(0, 0) rotate(0deg); }
            }
            @keyframes stack-drop {
              from { opacity: 0; transform: translateY(-80px) scale(0.7); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
        </Scene>

        <Scene duration={3.4} className="flex items-center justify-center">
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at 50% 50%, ${GOLD}14, transparent 62%)`,
            }}
          />
          <Reveal enter={[80, 480]} y={30} exit="transition">
            <div
              className="text-7xl font-semibold tracking-tight"
              style={{ letterSpacing: "-0.04em" }}
            >
              Built to hold.
            </div>
          </Reveal>
        </Scene>

        <Scene duration={2.9} className="flex items-center justify-center gap-8">
          <Reveal enter={[40, 420]} x={-36} y={0}>
            <StudyMarker letter="01" size={112} />
          </Reveal>
          <Reveal enter={[280, 640]} x={28} y={0}>
            <DisplayText size={48}>In good company.</DisplayText>
          </Reveal>
        </Scene>
      </Timegroup>
    </ExampleRoot>
  );
}
