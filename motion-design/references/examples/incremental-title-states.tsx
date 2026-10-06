import { Reveal, Solo } from "../src/primitives";

const STATES = [
  { label: "Write", enter: [80, 400] as const, exit: [900, 1140] as const },
  { label: "Edit", enter: [1000, 1320] as const, exit: [1900, 2140] as const },
  { label: "Ship", enter: [2000, 2320] as const, exit: undefined },
];

export const duration = 3.6;
export const aspect = "landscape" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <div className="relative h-full w-full">
        {STATES.map((state) => (
          <Reveal
            key={state.label}
            enter={state.enter}
            exit={state.exit}
            y={28}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div
              className="font-semibold tracking-tight"
              style={{ fontSize: 180, letterSpacing: "-0.05em" }}
            >
              {state.label}
            </div>
          </Reveal>
        ))}
      </div>
    </Solo>
  );
}
