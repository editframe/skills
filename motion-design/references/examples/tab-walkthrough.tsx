import { Cursor, SELECT, Solo, Window } from "../src/primitives";

const TABS = [
  { label: "Brief" },
  { label: "Deploy" },
  { label: "Checks" },
  { label: "SKU", insert: true },
];

export const duration = 5;
export const aspect = "landscape" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration} theme="saas">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 40% 18%, rgba(91,140,255,0.12), transparent 50%)",
        }}
      />
      <div className="flex h-full w-full items-center justify-center">
        <Window title="workspace" width={1040} height={560}>
          <div className="relative h-full">
            <div
              className="relative flex h-20 items-end gap-10 px-10"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
            >
              {TABS.map((tab, i) => (
                <div
                  key={tab.label}
                  className="pb-5 text-[28px]"
                  style={{
                    color: "rgba(244,241,234,0.4)",
                    animation: tab.insert
                      ? `tab-insert 360ms 3180ms both, tab-on-${i} 5s linear both`
                      : `tab-on-${i} 5s linear both`,
                    overflow: tab.insert ? "hidden" : undefined,
                    whiteSpace: "nowrap",
                  }}
                >
                  {tab.label}
                </div>
              ))}
              <div
                className="absolute bottom-0 h-[3px]"
                style={{
                  background: SELECT,
                  boxShadow: `0 0 18px ${SELECT}`,
                  animation: "tab-underline 5s linear both",
                }}
              />
            </div>
            <div className="px-12 pt-14">
              <div className="mt-4 text-[56px] font-semibold tracking-tight">Walk the path</div>
            </div>
            <div
              className="pointer-events-none absolute z-10"
              style={{
                top: 32,
                animation: "tab-cursor-hop 5s linear both",
              }}
            >
              <Cursor x={0} y={0} delay={120} duration={380} />
            </div>
          </div>
        </Window>
      </div>
      <style>{`
        @keyframes tab-underline {
          0%, 18% { left: 40px; width: 86px; }
          22%, 42% { left: 164px; width: 112px; }
          46%, 62% { left: 314px; width: 118px; }
          68%, 100% { left: 470px; width: 72px; }
        }
        @keyframes tab-cursor-hop {
          0%, 8% { left: 64px; }
          18%, 40% { left: 196px; }
          46%, 60% { left: 348px; }
          68%, 100% { left: 490px; }
        }
        @keyframes tab-insert {
          from { max-width: 0; opacity: 0; padding-left: 0; }
          to { max-width: 140px; opacity: 1; }
        }
        @keyframes tab-on-0 {
          0%, 17% { color: #f4f1ea; }
          22%, 100% { color: rgba(244,241,234,0.4); }
        }
        @keyframes tab-on-1 {
          0%, 17% { color: rgba(244,241,234,0.4); }
          22%, 41% { color: #f4f1ea; }
          46%, 100% { color: rgba(244,241,234,0.4); }
        }
        @keyframes tab-on-2 {
          0%, 41% { color: rgba(244,241,234,0.4); }
          46%, 61% { color: #f4f1ea; }
          68%, 100% { color: rgba(244,241,234,0.4); }
        }
        @keyframes tab-on-3 {
          0%, 67% { color: rgba(244,241,234,0.4); }
          68%, 100% { color: #f4f1ea; }
        }
      `}</style>
    </Solo>
  );
}
