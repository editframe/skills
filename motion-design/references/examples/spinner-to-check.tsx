import { Check, Solo, Spinner } from "../src/primitives";

const RESOLVE = 1400;

export const duration = 3;
export const aspect = "landscape" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <div className="flex h-full w-full items-center justify-center">
        <div className="relative" style={{ width: 180, height: 180 }}>
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ animation: `hide 80ms ${RESOLVE - 80}ms both` }}
          >
            <Spinner size={180} />
          </div>
          <div className="absolute inset-0">
            <Check delay={RESOLVE} size={180} />
          </div>
        </div>
      </div>
    </Solo>
  );
}
