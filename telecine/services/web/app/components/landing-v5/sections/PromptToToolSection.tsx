import { Link } from "react-router";
import { TrimTool } from "../index";

export function PromptToToolSection() {
  return (
    <section className="relative py-24 bg-[var(--poster-green)] text-white overflow-hidden">
      {/* Stacked blocks pattern - composable, modular, building */}
      <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/4 w-[500px] h-[500px] opacity-[0.08]">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <rect x="10" y="70" width="80" height="15" fill="white" />
          <rect x="20" y="55" width="60" height="15" fill="white" />
          <rect x="15" y="40" width="50" height="15" fill="white" />
          <rect x="25" y="25" width="40" height="15" fill="white" />
          <rect x="30" y="10" width="30" height="15" fill="white" />
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-7xl font-black tracking-tighter uppercase mb-4">
            Prompt it
          </h2>
          <div className="flex justify-center items-center gap-2 mb-6">
            <div className="w-16 h-2 bg-white" />
            <div className="w-12 h-2 bg-white/70" />
            <div className="w-8 h-2 bg-white/40" />
          </div>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            Agent skills turn natural language into production-ready video tools.
            Describe what you want. Get working code.
          </p>
        </div>

        {/* Prompt Example */}
        <div className="max-w-3xl mx-auto mb-12">
          <div className="relative">
            <div className="absolute -bottom-4 -right-4 w-full h-full bg-[var(--poster-gold)]" />
            <div className="relative bg-[var(--card-dark-bg)] border-4 border-white overflow-hidden">
              {/* Terminal Header */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/20">
                <div className="w-3 h-3 rounded-full bg-[var(--poster-red)]" />
                <div className="w-3 h-3 rounded-full bg-[var(--poster-gold)]" />
                <div className="w-3 h-3 rounded-full bg-[var(--poster-green)]" />
                <span className="ml-3 text-white/40 text-xs font-mono uppercase tracking-wider">prompt</span>
              </div>
              
              {/* Prompt Content */}
              <div className="p-6 font-mono text-sm">
                <div className="text-[var(--poster-gold)] mb-4">@editor-gui</div>
                <div className="text-white text-lg leading-relaxed">
                  Build a video trim tool with preview, playback controls, 
                  and draggable in/out markers.
                </div>
              </div>

              {/* Output Preview */}
              <div className="border-t border-white/20 bg-white/5 p-6">
                <div className="flex items-center gap-2 text-xs text-white/50 uppercase tracking-wider mb-4">
                  <svg className="w-4 h-4 text-[var(--poster-green)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Generated
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  {['Preview', 'Scrubber', 'TogglePlay', 'TrimHandles'].map((comp) => (
                    <div key={comp} className="bg-white/10 px-3 py-2 text-center font-mono text-white/70">
                      {`<${comp} />`}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Arrow connecting prompt to result */}
        <div className="flex justify-center mb-8">
          <svg className="w-8 h-16 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>

        {/* The Result - Trim Tool */}
        <div className="max-w-5xl mx-auto">
          <div className="mb-6 text-center">
            <div className="inline-flex items-center gap-3 bg-white/10 px-6 py-3 border-2 border-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-sm font-bold uppercase tracking-wider">The Result</span>
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute -bottom-4 -right-4 w-full h-full bg-[var(--poster-blue)]" />
            <div className="relative bg-[var(--paper-cream)] border-4 border-white p-6">
              <TrimTool />
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <Link
            to="/docs/skills"
            className="inline-flex items-center px-8 py-4 bg-white text-[var(--poster-green)] font-bold text-sm uppercase tracking-wider hover:bg-[var(--poster-gold)] hover:text-[var(--ink-black)] transition-colors shadow-poster-hard"
          >
            Explore skills
            <svg className="ml-3 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
