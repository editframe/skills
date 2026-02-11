import { ArchitectureDiagram } from "../index";

export function ArchitectureSection() {
  return (
    <section className="relative py-24 bg-[var(--paper-cream)] border-t-4 border-[var(--ink-black)] dark:border-white overflow-hidden">
      {/* Parallel horizontal lines - representing parallel rendering/processing */}
      <div className="absolute top-0 left-0 w-full h-full opacity-[0.04] dark:opacity-[0.03] pointer-events-none">
        <svg className="w-full h-full" preserveAspectRatio="none">
          {Array.from({ length: 12 }).map((_, i) => (
            <rect 
              key={i} 
              x="0" 
              y={`${i * 8.33}%`} 
              width="100%" 
              height="2%" 
              fill="var(--poster-gold)" 
            />
          ))}
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-5xl md:text-6xl font-black tracking-tighter uppercase mb-4">
            Dual
          </h2>
          {/* Parallel lines echoing the concept */}
          <div className="flex justify-center gap-1 mb-4">
            <div className="w-24 h-1 bg-[var(--poster-gold)]" />
            <div className="w-24 h-1 bg-[var(--poster-blue)]" />
          </div>
          <h2 className="text-5xl md:text-6xl font-black tracking-tighter uppercase mb-6">
            <span className="text-[var(--poster-gold)]">Preview</span>
            {" + "}
            <span className="text-[var(--poster-blue)]">Render</span>
          </h2>
          <p className="text-lg text-[var(--warm-gray)] leading-relaxed mb-4">
            Same code, two execution paths. Instant preview in the browser for development.
            Parallel fragment rendering in the cloud for production at scale.
          </p>
          <div className="inline-block bg-[var(--card-bg)] border-2 border-[var(--ink-black)] dark:border-white px-4 py-2 font-mono text-sm">
            <span className="text-[var(--warm-gray)]">$</span> <span className="text-[var(--ink-black)] dark:text-[var(--ink-black)]">editframe render</span>
          </div>
        </div>

        <div className="max-w-5xl mx-auto">
          <ArchitectureDiagram />
        </div>
      </div>
    </section>
  );
}
