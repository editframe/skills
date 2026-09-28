import { CREAM, INK, Solo, DisplayText } from "../src/primitives";

export const duration = 3;
export const aspect = "landscape" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration} background={INK}>
      <div className="flex h-full w-full items-center justify-center" style={{ color: CREAM }}>
        <div
          style={{
            animation: [
              "title-in 300ms 0ms cubic-bezier(0.33,1,0.68,1) both",
              "title-out 250ms 2750ms cubic-bezier(0.32,0,0.67,0) forwards",
            ].join(", "),
          }}
        >
          <DisplayText size={104}>In motion.</DisplayText>
        </div>
      </div>
    </Solo>
  );
}
