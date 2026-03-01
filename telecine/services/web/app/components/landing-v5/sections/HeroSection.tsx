import { lazy, Suspense, useState } from "react";
import { Link } from "react-router";
import { HeroDemoPoster } from "../HeroDemoPoster";

const HeroDemo = lazy(() => import("../HeroDemo").then((m) => ({ default: m.HeroDemo })));

export function HeroSection() {
  const [demoPending, setDemoPending] = useState(false);

  return (
    <section className="relative pt-24 pb-20 bg-[var(--paper-cream)] texture-paper overflow-hidden">
      {/* Giant play button triangle */}
      <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/3 w-[700px] h-[700px] opacity-[0.07] dark:opacity-[0.05]" aria-hidden="true">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <polygon points="20,10 20,90 85,50" fill="var(--poster-red)" />
        </svg>
      </div>

      <div className="relative max-w-5xl mx-auto px-6">
        {/* Compact header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black leading-[0.9] tracking-tighter mb-4">
            <span>Build video </span>
            <span className="text-[var(--poster-red)]">with code</span>
          </h1>

          <div className="flex items-center justify-center gap-4 mb-4" aria-hidden="true">
            <div className="w-0 h-0 border-l-[16px] border-l-[var(--poster-red)] border-y-[10px] border-y-transparent" />
            <div className="w-0 h-0 border-l-[12px] border-l-[var(--poster-gold)] border-y-[7px] border-y-transparent" />
            <div className="w-0 h-0 border-l-[8px] border-l-[var(--poster-blue)] border-y-[5px] border-y-transparent" />
          </div>

          <p className="text-lg text-[var(--warm-gray)] max-w-lg mx-auto leading-relaxed">
            Declarative HTML + CSS that renders to video. Script it, or use React. Instant preview. Parallel rendering at scale.
          </p>
        </div>

        {/* Demo — preview-dominant, full width */}
        <div className="relative mb-8">
          <div className="absolute -bottom-3 -right-3 md:-bottom-4 md:-right-4 w-full h-full bg-[var(--poster-blue)]" aria-hidden="true" />
          <div className="absolute -bottom-1.5 -right-1.5 md:-bottom-2 md:-right-2 w-full h-full bg-[var(--poster-gold)]" aria-hidden="true" />
          <div className="relative">
            {demoPending ? (
              <Suspense fallback={<HeroDemoPoster />}>
                <HeroDemo />
              </Suspense>
            ) : (
              <button
                type="button"
                onClick={() => setDemoPending(true)}
                className="relative block w-full text-left p-0 border-0 bg-transparent group"
                aria-label="Play Editframe demo"
              >
                <HeroDemoPoster />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
                  <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                    <svg className="w-7 h-7 text-[var(--poster-red)] ml-1" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* CLI + CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <div className="bg-[var(--ink-black)] dark:bg-[#1a1a1a] px-5 py-3 font-mono text-sm flex items-center gap-3 border-2 border-[var(--ink-black)] dark:border-white/20">
            <span>
              <span className="text-[var(--poster-gold)]">$</span>
              <span className="text-white ml-2">npm create @editframe@latest</span>
            </span>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText("npm create @editframe@latest")}
              className="text-white/40 hover:text-white transition-colors flex-shrink-0"
              aria-label="Copy npm create @editframe@latest command"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>

          <Link
            to="/auth/register"
            className="inline-flex items-center justify-center px-8 py-3 bg-[var(--poster-red)] text-white font-bold text-sm uppercase tracking-wider shadow-poster-hard hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
          >
            Get Early Access
            <svg className="ml-3 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>

          <Link
            to="/skills"
            className="inline-flex items-center justify-center px-8 py-3 border-2 border-[var(--ink-black)] dark:border-white font-bold text-sm uppercase tracking-wider hover:bg-[var(--ink-black)] hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
          >
            Docs & Skills
          </Link>
        </div>
      </div>
    </section>
  );
}
