import { Link } from "react-router";
import { HeroDemo } from "../index";

export function HeroSection() {
  return (
    <section className="relative pt-32 pb-24 bg-[var(--paper-cream)] texture-paper overflow-hidden">
      {/* Giant play button triangle - THE motivated shape (we make video play) */}
      <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/3 w-[700px] h-[700px] opacity-[0.07] dark:opacity-[0.05]">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <polygon points="20,10 20,90 85,50" fill="var(--poster-red)" />
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left - Typography */}
          <div>
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-black leading-[0.9] tracking-tighter mb-6">
              <span className="block">Build</span>
              <span className="block">video</span>
              <span className="block text-[var(--poster-red)]">with code</span>
            </h1>
            
            {/* Play button echo as divider - reinforces the concept */}
            <div className="flex items-center gap-4 mb-8">
              <div className="w-0 h-0 border-l-[16px] border-l-[var(--poster-red)] border-y-[10px] border-y-transparent" />
              <div className="w-0 h-0 border-l-[12px] border-l-[var(--poster-gold)] border-y-[7px] border-y-transparent" />
              <div className="w-0 h-0 border-l-[8px] border-l-[var(--poster-blue)] border-y-[5px] border-y-transparent" />
            </div>
            
            <p className="text-xl text-[var(--warm-gray)] mb-10 max-w-md leading-relaxed">
              React components that render to video. Instant preview. Parallel rendering at scale.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/welcome"
                className="inline-flex items-center justify-center px-8 py-4 bg-[var(--ink-black)] dark:bg-white text-white dark:text-black font-bold text-sm uppercase tracking-wider shadow-poster-hard hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
              >
                Start building
                <svg className="ml-3 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <Link
                to="/docs"
                className="inline-flex items-center justify-center px-8 py-4 border-2 border-[var(--ink-black)] dark:border-white font-bold text-sm uppercase tracking-wider hover:bg-[var(--ink-black)] hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
              >
                Documentation
              </Link>
            </div>
          </div>

          {/* Right - Demo framed like a screen/monitor */}
          <div className="relative">
            {/* Stacked frames like film/video layers */}
            <div className="absolute -top-4 -right-4 w-full h-full bg-[var(--poster-blue)]" />
            <div className="absolute -top-2 -right-2 w-full h-full bg-[var(--poster-gold)]" />
            <div className="relative bg-[var(--card-bg)] border-4 border-[var(--ink-black)] dark:border-white overflow-hidden">
              <HeroDemo />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
