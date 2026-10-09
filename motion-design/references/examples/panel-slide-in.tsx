import { CREAM, INK, LINE, MUTED, Solo, Window } from "../src/primitives";

export const duration = 3;
export const aspect = "landscape" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <div className="flex h-full w-full items-center justify-center">
        <Window title="workspace" width={1080} height={620}>
          <div className="relative flex h-full">
            <div className="flex flex-1 flex-col justify-center px-12">
              <div className="text-6xl font-semibold tracking-tight">Brief</div>
              <div className="mt-4 text-2xl" style={{ color: MUTED }}>
                Checks ready
              </div>
            </div>
            <div
              className="flex h-full flex-col justify-center px-10"
              style={{
                width: 380,
                background: CREAM,
                borderLeft: `1px solid ${LINE}`,
                color: INK,
                animation: "panel-in 420ms 360ms cubic-bezier(0.33,1,0.68,1) both",
              }}
            >
              <div
                className="uppercase"
                style={{ fontSize: 13, letterSpacing: "0.16em", color: MUTED, fontWeight: 600 }}
              >
                panel
              </div>
              <div className="mt-4 text-4xl font-semibold tracking-tight">Deploy</div>
            </div>
          </div>
        </Window>
      </div>
    </Solo>
  );
}
