import { ACCENT, INK, Reveal, Solo } from "../src/primitives";

const ROWS = [
  { name: "Draft", price: "$12.69", hero: false },
  { name: "Studio", price: "$6.77", hero: false },
  { name: "CAN", price: "$4.63", hero: false },
  { name: "SKU", price: "$6.76", hero: false },
  { name: "Brief", price: "$7.34", hero: false },
  { name: "Checks", price: "$1.49", hero: false },
  { name: "Deploy", price: "$2.91", hero: false },
  { name: "TOTAL", price: "$1.38", hero: true },
] as const;

export const duration = 5;
export const aspect = "landscape" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <div className="flex h-full w-full items-center px-28">
        <Reveal enter={[0, 420]} y={48} className="w-[640px]">
          <div className="text-7xl font-semibold tracking-tight">Cost per SKU</div>
        </Reveal>
        <div className="relative ml-auto h-[640px] w-[560px] overflow-hidden">
          <div
            className="absolute left-0 w-full"
            style={{ animation: "board-scroll 5s cubic-bezier(0.33,1,0.68,1) both" }}
          >
            {ROWS.map((row, i) => (
              <div key={row.name} className="relative mb-3 h-[72px]">
                <div
                  className="absolute inset-0 flex items-center justify-between"
                  style={{ animation: `pale-${i} 5s linear both` }}
                >
                  <span className="text-3xl" style={{ color: "#b9b3a8" }}>
                    {row.name}
                  </span>
                  <span
                    className="rounded-xl px-4 py-2 text-2xl"
                    style={{
                      background: row.hero ? "#eef8f2" : "#fdf3ee",
                      color: row.hero ? "#c8e9d6" : "#f7d3c4",
                    }}
                  >
                    {row.price}
                  </span>
                </div>
                <div
                  className="absolute inset-0 flex items-center justify-between"
                  style={{ animation: `focus-${i} 5s linear both` }}
                >
                  <span className="text-3xl font-medium" style={{ color: INK }}>
                    {row.name}
                  </span>
                  <span
                    className="rounded-xl px-4 py-2 text-2xl"
                    style={{
                      background: row.hero ? "#ddf1e4" : "#f6cbb6",
                      color: row.hero ? "#3d7a4a" : ACCENT,
                    }}
                  >
                    {row.price}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes board-scroll {
          0% { transform: translateY(420px); }
          12% { transform: translateY(280px); }
          55% { transform: translateY(0); }
          100% { transform: translateY(0); }
        }
        @keyframes pale-0 { 0%{opacity:1} 18%{opacity:1} 22%{opacity:0} 100%{opacity:0} }
        @keyframes focus-0 { 0%{opacity:0} 18%{opacity:0} 22%{opacity:1} 26%{opacity:1} 30%{opacity:0} 100%{opacity:0} }
        @keyframes pale-1 { 0%{opacity:1} 22%{opacity:1} 26%{opacity:0} 30%{opacity:0} 34%{opacity:1} 100%{opacity:1} }
        @keyframes focus-1 { 0%{opacity:0} 22%{opacity:0} 26%{opacity:1} 30%{opacity:1} 34%{opacity:0} 100%{opacity:0} }
        @keyframes pale-2 { 0%{opacity:1} 28%{opacity:1} 32%{opacity:0} 36%{opacity:0} 40%{opacity:1} 100%{opacity:1} }
        @keyframes focus-2 { 0%{opacity:0} 28%{opacity:0} 32%{opacity:1} 36%{opacity:1} 40%{opacity:0} 100%{opacity:0} }
        @keyframes pale-3 { 0%{opacity:1} 34%{opacity:1} 38%{opacity:0} 42%{opacity:0} 46%{opacity:1} 100%{opacity:1} }
        @keyframes focus-3 { 0%{opacity:0} 34%{opacity:0} 38%{opacity:1} 42%{opacity:1} 46%{opacity:0} 100%{opacity:0} }
        @keyframes pale-4 { 0%{opacity:1} 40%{opacity:1} 44%{opacity:0} 48%{opacity:0} 52%{opacity:1} 100%{opacity:1} }
        @keyframes focus-4 { 0%{opacity:0} 40%{opacity:0} 44%{opacity:1} 48%{opacity:1} 52%{opacity:0} 100%{opacity:0} }
        @keyframes pale-5 { 0%{opacity:1} 46%{opacity:1} 50%{opacity:0} 54%{opacity:0} 58%{opacity:1} 100%{opacity:1} }
        @keyframes focus-5 { 0%{opacity:0} 46%{opacity:0} 50%{opacity:1} 54%{opacity:1} 58%{opacity:0} 100%{opacity:0} }
        @keyframes pale-6 { 0%{opacity:1} 52%{opacity:1} 56%{opacity:0} 62%{opacity:0} 66%{opacity:1} 100%{opacity:1} }
        @keyframes focus-6 { 0%{opacity:0} 52%{opacity:0} 56%{opacity:1} 62%{opacity:1} 66%{opacity:0} 100%{opacity:0} }
        @keyframes pale-7 { 0%{opacity:1} 62%{opacity:1} 68%{opacity:0} 100%{opacity:0} }
        @keyframes focus-7 { 0%{opacity:0} 62%{opacity:0} 68%{opacity:1} 100%{opacity:1} }
        ef-text-segment {
          display: inline-block;
          animation: reveal-in 400ms calc(var(--ef-stagger-offset, 0s)) cubic-bezier(0.33,1,0.68,1) both;
        }
      `}</style>
    </Solo>
  );
}
