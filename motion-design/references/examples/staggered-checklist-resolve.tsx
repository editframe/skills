import { Check, Reveal, Solo, Spinner, useAspect } from "../src/primitives";

const ITEMS = ["Clone repos", "Configure secrets", "Install deps", "Environment ready"];
const APPEAR = 80;
const RESOLVE = [950, 1200, 1450, 1700];

export const duration = 2.5;
export const aspect = "landscape" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration} theme="saas" background="#050505">
      <List />
    </Solo>
  );
}

function List() {
  const frame = useAspect();
  const type = frame === "landscape" ? 72 : 56;
  const icon = frame === "landscape" ? 80 : 64;
  return (
    <div className="flex h-full w-full items-center px-[8%]">
      <div className="w-full max-w-[1480px]">
        {ITEMS.map((label, i) => {
          const resolve = RESOLVE[i];
          return (
            <Reveal key={label} enter={[i * APPEAR, i * APPEAR + 240]} x={-16} y={0}>
              <div className="mb-10 flex items-center gap-8">
                <div className="relative shrink-0" style={{ width: icon, height: icon }}>
                  {i === 0 ? (
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ animation: `hide 80ms ${resolve - 80}ms both` }}
                    >
                      <Spinner size={icon} />
                    </div>
                  ) : (
                    <svg
                      width={icon}
                      height={icon}
                      className="absolute inset-0"
                      style={{ animation: `hide 80ms ${resolve}ms both` }}
                    >
                      <circle
                        cx={icon / 2}
                        cy={icon / 2}
                        r={icon * 0.38}
                        fill="none"
                        stroke="rgba(255,255,255,0.28)"
                        strokeWidth="3"
                        strokeDasharray="8 6"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                  <div className="absolute inset-0">
                    <Check delay={resolve} size={icon} />
                  </div>
                </div>
                <div
                  className="font-medium tracking-tight"
                  style={{
                    fontSize: type,
                    letterSpacing: "-0.03em",
                    animation: `brighten 200ms ${resolve}ms both`,
                  }}
                >
                  {label}
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
      <style>{`
        @keyframes brighten {
          from { color: rgba(244,241,234,0.34); }
          to { color: #f4f1ea; }
        }
      `}</style>
    </div>
  );
}
