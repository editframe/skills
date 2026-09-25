import { ACCENT, Card, CREAM, INK, MUTED, NAVY, Reveal, Solo } from "../src/primitives";

export const duration = 5;
export const aspect = "landscape" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration} background="#d8e4dc">
      <div
        className="absolute overflow-hidden rounded-[42px]"
        style={{
          left: 620,
          top: 40,
          width: 680,
          height: 1000,
          background: NAVY,
          boxShadow: "0 24px 80px rgba(0,0,0,0.22)",
          transformOrigin: "50% 18%",
          animation: "phone-zoom 5000ms cubic-bezier(0.45,0,0.55,1) both",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 20% 40%, #5b7fd4 0%, transparent 42%), linear-gradient(160deg, #1e3a8a, #0f172a)",
          }}
        />
        <Reveal enter={[0, 360]} y={0} className="absolute inset-x-0 top-8 px-10 text-white">
          <div className="flex items-center justify-between text-sm font-medium">
            <span>MESSAGES</span>
            <span>●●●</span>
          </div>
          <div className="mt-10 text-7xl font-light leading-none">9:30</div>
          <div className="mt-3 text-xl" style={{ color: "#c9d4ee" }}>
            Tue Sep 16
          </div>
        </Reveal>

        <div
          className="absolute left-8 right-8"
          style={{
            top: 340,
            animation: "notif-back 5000ms cubic-bezier(0.33,1,0.68,1) both",
          }}
        >
          <Card className="flex items-center gap-5 px-6 py-5">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-semibold text-white"
              style={{ background: ACCENT }}
            >
              C
            </div>
            <div>
              <div className="text-lg font-semibold">
                Checks{" "}
                <span className="font-normal" style={{ color: MUTED }}>
                  · 3m
                </span>
              </div>
              <div className="text-base" style={{ color: MUTED }}>
                All checks passed.
              </div>
            </div>
          </Card>
        </div>

        <div
          className="absolute left-8 right-8"
          style={{
            top: 530,
            animation: "notif-front 5000ms cubic-bezier(0.33,1,0.68,1) both",
          }}
        >
          <Card className="flex items-center gap-5 px-6 py-5" style={{ background: CREAM }}>
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-semibold text-white"
              style={{ background: NAVY }}
            >
              D
            </div>
            <div>
              <div className="text-lg font-semibold" style={{ color: INK }}>
                Deploy{" "}
                <span className="font-normal" style={{ color: MUTED }}>
                  · 1m
                </span>
              </div>
              <div className="text-base" style={{ color: MUTED }}>
                SKU 01 is ready to ship.
              </div>
            </div>
          </Card>
        </div>
      </div>
      <style>{`
        @keyframes phone-zoom {
          0%, 12% { transform: scale(1); }
          20%, 52% { transform: translateY(-36px) scale(2.15); }
          74%, 100% { transform: scale(1); }
        }
        @keyframes notif-front {
          0%, 12% { transform: none; }
          20% { transform: translateY(-28px) scale(0.96); }
          32%, 52% { transform: translateY(-12px) scale(1.12); }
          74%, 100% { transform: none; }
        }
        @keyframes notif-back {
          0%, 18% { opacity: 0.85; transform: none; }
          28%, 52% { opacity: 1; transform: translateY(-150px) scale(1.06); }
          74%, 100% { opacity: 1; transform: none; }
        }
      `}</style>
    </Solo>
  );
}
