import { Check, Solo } from "../src/primitives";

export const duration = 2.5;
export const aspect = "landscape" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <div className="flex h-full w-full items-center justify-center">
        <Check delay={320} size={200} />
      </div>
    </Solo>
  );
}
