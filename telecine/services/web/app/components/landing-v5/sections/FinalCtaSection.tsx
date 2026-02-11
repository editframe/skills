import { Link } from "react-router";

export function FinalCtaSection() {
  return (
    <section className="relative py-32 bg-[var(--poster-red)] text-white overflow-hidden">
      {/* Giant arrow pointing right - GO, START, LAUNCH */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] opacity-[0.08]">
        <svg viewBox="0 0 200 100" className="w-full h-full">
          <polygon points="0,30 150,30 150,10 200,50 150,90 150,70 0,70" fill="white" />
        </svg>
      </div>
      
      {/* Solid color block accent */}
      <div className="absolute top-0 right-0 w-24 h-full bg-[var(--poster-gold)]" />
      
      <div className="relative max-w-7xl mx-auto px-6 text-center">
        <h2 className="text-6xl md:text-8xl font-black tracking-tighter uppercase mb-4">
          Ready?
        </h2>
        {/* Arrow pointing to action - GO! */}
        <div className="flex justify-center mb-8">
          <div className="w-0 h-0 border-l-[40px] border-l-white border-y-[24px] border-y-transparent" />
        </div>
        
        <p className="text-xl text-white/90 mb-10 max-w-lg mx-auto">
          Start building in minutes. No infrastructure to manage. Scale when you're ready.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/welcome"
            className="inline-flex items-center justify-center px-10 py-4 bg-white text-[var(--ink-black)] font-bold uppercase tracking-wider shadow-poster-hard hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-all"
          >
            Start building
            <svg className="ml-3 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
          <Link
            to="/docs"
            className="inline-flex items-center justify-center px-10 py-4 border-2 border-white text-white font-bold uppercase tracking-wider hover:bg-white hover:text-[var(--poster-red)] transition-colors"
          >
            Read docs
          </Link>
        </div>

        <p className="mt-10 text-sm text-white/70">
          Need enterprise features?{' '}
          <Link to="/contact" className="underline hover:text-white font-bold">
            Talk to sales
          </Link>
        </p>
      </div>
    </section>
  );
}
