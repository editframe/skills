import { Solo } from "../src/primitives";

export const duration = 2.5;
export const aspect = "landscape" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <div className="flex h-full w-full items-end justify-center" style={{ paddingBottom: 180 }}>
        <div
          className="text-center font-medium"
          style={{
            fontSize: 72,
            letterSpacing: "-0.03em",
            animation: "caption-up 360ms 200ms cubic-bezier(0.33,1,0.68,1) both",
          }}
        >
          Brief, then ship
        </div>
      </div>
    </Solo>
  );
}
