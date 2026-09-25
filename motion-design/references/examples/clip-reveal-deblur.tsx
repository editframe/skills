import { Card, StudyMarker, Reveal, Solo } from "../src/primitives";

export const duration = 3.5;
export const aspect = "landscape" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <div className="flex h-full w-full items-center justify-center">
        <Reveal enter={[80, 420]} y={18}>
          <Card className="overflow-hidden p-0" style={{ width: 720, height: 420 }}>
            <div
              className="flex h-full w-full items-center justify-center"
              style={{
                background: "linear-gradient(160deg, #efeae0, #d4cdc0)",
                animation: "clip-deblur 420ms 520ms cubic-bezier(0.33,1,0.68,1) both",
              }}
            >
              <StudyMarker letter="01" size={160} />
            </div>
          </Card>
        </Reveal>
      </div>
      <style>{`
        @keyframes clip-deblur {
          from {
            clip-path: inset(100% 0 0 0);
            filter: blur(8px);
          }
          to {
            clip-path: inset(0 0 0 0);
            filter: blur(0);
          }
        }
      `}</style>
    </Solo>
  );
}
