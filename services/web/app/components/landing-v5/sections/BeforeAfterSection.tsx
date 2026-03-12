import { BeforeAfterComparison } from "../BeforeAfterComparison";

export function BeforeAfterSection() {
  return (
    <section className="relative py-24 border-t-4 border-[var(--ink-black)] dark:border-white overflow-hidden">
      {/* Giant arrow pointing right - transformation, progress, the change */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] opacity-[0.04] dark:opacity-[0.03] pointer-events-none">
        <svg viewBox="0 0 200 100" className="w-full h-full">
          <polygon
            points="0,25 140,25 140,0 200,50 140,100 140,75 0,75"
            fill="var(--poster-green)"
          />
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="flex items-center gap-6 mb-16">
          <h2 className="text-5xl md:text-6xl font-black tracking-tighter uppercase text-[var(--ink-black)] dark:text-white">
            Before
          </h2>
          {/* Arrow between words - the transformation */}
          <div className="hidden md:block w-0 h-0 border-l-[24px] border-l-[var(--poster-green)] border-y-[14px] border-y-transparent" />
          <h2 className="text-5xl md:text-6xl font-black tracking-tighter uppercase text-[var(--poster-green)]">
            After
          </h2>
        </div>

        <BeforeAfterComparison />
      </div>
    </section>
  );
}
