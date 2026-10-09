import { ACCENT, MUTED, Reveal, Solo } from "../src/primitives";

export const duration = 3.4;
export const aspect = "landscape" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-center">
          <Reveal enter={[0, 480]} y={18}>
            <div
              className="text-sm font-semibold uppercase"
              style={{ letterSpacing: "0.16em", color: MUTED }}
            >
              MOTION STUDY
            </div>
          </Reveal>
          <Reveal enter={[160, 640]} y={22}>
            <div className="relative mt-6 inline-block text-6xl font-semibold tracking-tight">
              Make it{" "}
              <span className="relative inline-block">
                move
                <svg
                  className="absolute left-0 top-full mt-1"
                  width="240"
                  height="14"
                  viewBox="0 0 240 14"
                  fill="none"
                >
                  <path
                    d="M2 9 C 70 2, 160 16, 238 6"
                    stroke={ACCENT}
                    strokeWidth="5"
                    strokeLinecap="round"
                    pathLength="1"
                    style={{
                      strokeDasharray: 1,
                      strokeDashoffset: 1,
                      animation: "draw 380ms 780ms cubic-bezier(0.33,1,0.68,1) both",
                    }}
                  />
                </svg>
              </span>
            </div>
          </Reveal>
        </div>
      </div>
    </Solo>
  );
}
