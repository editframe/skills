import { NAVY, Reveal, Solo } from "../src/primitives";

export const duration = 2.5;
export const aspect = "landscape" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <div className="flex h-full w-full items-center justify-center">
        <Reveal enter={[0, 360]} y={16} scaleFrom={0.96}>
          <div
            className="rounded-full px-20 py-8 text-6xl font-semibold text-white"
            style={{
              background: NAVY,
              animation: "press-pop 160ms 900ms both",
            }}
          >
            Deploy
          </div>
        </Reveal>
      </div>
    </Solo>
  );
}
