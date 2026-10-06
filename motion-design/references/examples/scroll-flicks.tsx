import { LINE, Solo, Window, type Aspect } from "../src/primitives";

export const duration = 4;
export const posterTime = 2.5;
export const aspect = "landscape" as const;
const ITEMS = ["Outline", "Frames", "Type", "Color", "Motion", "Sound", "Review", "Export"];

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <div className="flex h-full w-full items-center justify-center">
        <Window title="" width={720} height={430}>
          <div style={{ position: "absolute", inset: "20px 40px 20px", overflow: "hidden" }}>
            <div style={{ animation: "scroll-flicks 4s linear both" }}>
              {ITEMS.map((label, i) => (
                <div
                  key={label}
                  className="flex items-center"
                  style={{
                    height: 88,
                    borderBottom: `1px solid ${LINE}40`,
                    fontSize: 32,
                    fontWeight: 500,
                    gap: 24,
                  }}
                >
                  <span style={{ fontSize: 16, fontVariantNumeric: "tabular-nums", opacity: 0.36 }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {label}
                </div>
              ))}
            </div>
          </div>
          <div
            style={{
              position: "absolute",
              right: 14,
              top: 20,
              bottom: 20,
              width: 3,
              background: "#ffffff12",
              borderRadius: 3,
            }}
          >
            <div
              style={{
                position: "absolute",
                width: 3,
                height: 116,
                borderRadius: 3,
                background: "#ffffff60",
                animation: "scroll-flick-thumb 4s linear both",
              }}
            />
          </div>
        </Window>
      </div>
      <style>{`
   @keyframes scroll-flicks {
    0%,12%{transform:translateY(0);animation-timing-function:cubic-bezier(.12,.75,.22,1)}
    18%,30%{transform:translateY(-88px);animation-timing-function:cubic-bezier(.12,.75,.22,1)}
    38%,47%{transform:translateY(-264px);animation-timing-function:cubic-bezier(.12,.75,.22,1)}
    55%,70%{transform:translateY(-352px);animation-timing-function:cubic-bezier(.65,0,.2,1)}
    88%,100%{transform:translateY(0)}
   }
   @keyframes scroll-flick-thumb {
    0%,12%{transform:translateY(0);animation-timing-function:cubic-bezier(.12,.75,.22,1)}
    18%,30%{transform:translateY(55px);animation-timing-function:cubic-bezier(.12,.75,.22,1)}
    38%,47%{transform:translateY(165px);animation-timing-function:cubic-bezier(.12,.75,.22,1)}
    55%,70%{transform:translateY(220px);animation-timing-function:cubic-bezier(.65,0,.2,1)}
    88%,100%{transform:translateY(0)}
   }
  `}</style>
    </Solo>
  );
}
