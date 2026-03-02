import { FanOutDiagram, JITStreamingDiagram } from "../ArchitectureDiagram";

export function ArchitectureSection() {
  return (
    <section className="relative py-24 bg-[var(--paper-cream)] border-t-4 border-[var(--ink-black)] dark:border-white overflow-hidden">
      {/* Parallel horizontal lines - representing parallel rendering/processing */}
      <div className="absolute top-0 left-0 w-full h-full opacity-[0.04] dark:opacity-[0.03] pointer-events-none" aria-hidden="true">
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
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tighter uppercase mb-6">
            Under the hood
          </h2>
          <div className="flex justify-center gap-1 mb-6">
            <div className="w-24 h-1 bg-[var(--poster-gold)]" />
            <div className="w-24 h-1 bg-[var(--poster-blue)]" />
          </div>
          <p className="text-lg text-[var(--warm-gray)] leading-relaxed">
            The rendering infrastructure that makes this possible.
          </p>
        </div>

        {/* 3D Explainer Demos */}
        <div className="grid md:grid-cols-2 gap-4 md:gap-8 max-w-6xl mx-auto">
          <div>
            <div className="mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-1 bg-[var(--poster-blue)]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--warm-gray)]">
                  Parallel Fragments
                </span>
              </div>
              <p className="text-xs text-[var(--warm-gray)] mt-1">Split, process, recombine</p>
            </div>
            <FanOutDiagram />
          </div>

          <div>
            <div className="mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-1 bg-[var(--poster-red)]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--warm-gray)]">
                  JIT Streaming
                </span>
              </div>
              <p className="text-xs text-[var(--warm-gray)] mt-1">On-demand transcoding, zero wait</p>
            </div>
            <JITStreamingDiagram />
          </div>
        </div>
      </div>
    </section>
  );
}
