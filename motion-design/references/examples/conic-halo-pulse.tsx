import { ACCENT, CREAM, NAVY, Solo } from "../src/primitives";

export const duration = 3;
export const aspect = "landscape" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <div className="flex h-full w-full items-center justify-center">
        <div className="relative">
          <div
            className="absolute"
            style={{
              inset: -22,
              borderRadius: 28,
              background: `conic-gradient(from 0deg, ${ACCENT}, ${NAVY}, ${ACCENT})`,
              filter: "blur(16px)",
              animation: "halo-glow 1800ms 200ms both",
            }}
          />
          <div
            className="relative rounded-2xl px-16 py-7 text-5xl font-semibold"
            style={{ background: CREAM, border: `1px solid ${NAVY}` }}
          >
            Deploy
          </div>
        </div>
      </div>
    </Solo>
  );
}
