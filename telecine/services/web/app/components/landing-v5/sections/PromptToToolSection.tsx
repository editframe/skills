import { lazy, Suspense, useRef, useState, useEffect } from "react";
import { Link } from "react-router";

const TrimTool = lazy(() => import("../tools/TrimTool").then(m => ({ default: m.TrimTool })));

const PROMPT_TEXT = "Build a video trim tool. Video preview on top that respects trim bounds. Below it a trim bar: play/pause toggle on the left, thumbnail strip with overlaid draggable trim handles on the right. Info bar with in/out/duration timecodes.";

function ToolSkeleton() {
  return (
    <div className="flex items-center justify-center min-h-[300px]">
      <div className="text-white/40 dark:text-white/40 text-sm">Loading tool...</div>
    </div>
  );
}

function LazyTrimTool() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref}>
      {visible ? (
        <Suspense fallback={<ToolSkeleton />}>
          <TrimTool />
        </Suspense>
      ) : (
        <ToolSkeleton />
      )}
    </div>
  );
}

export function PromptToToolSection() {
  return (
    <section className="relative py-24 bg-[var(--poster-green)] dark:bg-[#1a3a1a] text-white overflow-hidden">
      {/* Stacked blocks pattern - composable, modular, building */}
      <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/4 w-[500px] h-[500px] opacity-[0.08]" aria-hidden="true">
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
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-5xl md:text-7xl font-black tracking-tighter uppercase mb-4">
            Prompt it
          </h2>
          <div className="flex justify-center items-center gap-2 mb-6">
            <div className="w-16 h-2 bg-white" />
            <div className="w-12 h-2 bg-white/70" />
            <div className="w-8 h-2 bg-white/40" />
          </div>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            Skills are documentation your agent can use as tools.
            Describe what you want. Get working code.
          </p>
        </div>

        {/* Prompt + Tool side by side */}
        <div className="grid lg:grid-cols-5 gap-6 max-w-6xl mx-auto">
          {/* Prompt (2 cols) */}
          <div className="lg:col-span-2">
            <div className="relative h-full">
              <div className="absolute -bottom-3 -right-3 w-full h-full bg-[var(--poster-gold)]" />
              <div className="relative bg-[var(--card-dark-bg)] border-4 border-white overflow-hidden h-full flex flex-col">
                {/* Terminal Header */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/20">
                  <div className="w-3 h-3 rounded-full bg-[var(--poster-red)]" />
                  <div className="w-3 h-3 rounded-full bg-[var(--poster-gold)]" />
                  <div className="w-3 h-3 rounded-full bg-[var(--poster-green)]" />
                  <span className="ml-3 text-white/40 text-xs font-mono uppercase tracking-wider">prompt</span>
                </div>

                {/* Prompt Content */}
                <div className="p-4 md:p-6 font-mono text-sm flex-1">
                  <div className="text-[var(--poster-gold)] mb-3">@editor-gui</div>
                  <div className="text-white text-base leading-relaxed">
                    {PROMPT_TEXT}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* The Tool (3 cols) */}
          <div className="lg:col-span-3">
            <div className="relative">
              <div className="absolute -bottom-4 -right-4 w-full h-full bg-[var(--poster-blue)]" />
              <div className="relative bg-[var(--paper-cream)] dark:bg-[#1a1a1a] border-4 border-white p-4 md:p-6">
                <LazyTrimTool />
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <Link
            to="/skills"
            className="inline-flex items-center px-8 py-4 bg-white text-[var(--poster-green)] dark:text-[#1a3a1a] font-bold text-sm uppercase tracking-wider hover:bg-[var(--poster-gold)] hover:text-[var(--ink-black)] transition-colors shadow-poster-hard"
          >
            Explore docs & skills
            <svg className="ml-3 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
