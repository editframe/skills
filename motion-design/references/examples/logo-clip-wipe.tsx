import { Reveal, Solo, EditframeWordmark } from "../src/primitives";

export const duration = 3;
export const aspect = "landscape" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <div className="flex h-full w-full flex-col items-center justify-center">
        <div style={{ animation: "logo-wipe 500ms cubic-bezier(0.33,1,0.68,1) both" }}>
          <div className="flex items-center gap-10">
            <EditframeWordmark size={120} />
          </div>
        </div>
        <Reveal enter={[560, 900]} y={16} className="mt-12"></Reveal>
      </div>
    </Solo>
  );
}
