import { Card, Chip, Reveal, Solo } from "../src/primitives";

export const duration = 4.5;
export const aspect = "landscape" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <div className="flex h-full w-full items-center justify-center">
        <div
          style={{ animation: "stack-camera 700ms 2800ms cubic-bezier(0.32,0,0.67,0) forwards" }}
        >
          <div className="relative" style={{ width: 560, height: 340 }}>
            <div
              className="absolute inset-0"
              style={{ animation: "back-reveal 620ms 980ms cubic-bezier(0.33,1,0.68,1) both" }}
            >
              <Card className="flex h-full flex-col justify-between p-8">
                <Chip delay={0}>Brief</Chip>
              </Card>
            </div>
            <Reveal enter={[80, 560]} y={18} scaleFrom={0.96}>
              <div
                style={{ animation: "front-focus 640ms 900ms cubic-bezier(0.33,1,0.68,1) both" }}
              >
                <Card className="flex h-[340px] flex-col justify-between p-8">
                  <Chip delay={0} active>
                    Deploy
                  </Chip>
                </Card>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes back-reveal {
          from { transform: translate(0, 0) scale(0.96); opacity: 0.35; }
          to { transform: translate(88px, 56px) scale(0.94); opacity: 1; }
        }
        @keyframes front-focus {
          from { transform: translate(0, 0) scale(1); }
          to { transform: translate(-36px, -28px) scale(1.08); }
        }
        @keyframes stack-camera {
          0% { transform: scale(1); }
          30% { transform: scale(1.16); }
          100% { transform: scale(0.9); }
        }
      `}</style>
    </Solo>
  );
}
