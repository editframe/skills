import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link } from "react-router";

const TemplatedRenderingDemo = lazy(() =>
  import("../TemplatedRenderingDemo").then((m) => ({ default: m.TemplatedRenderingDemo }))
);

function DemoPlaceholder() {
  return (
    <div
      className="w-full flex items-center justify-center border-4 border-black dark:border-white"
      style={{ aspectRatio: "16/9", background: "#1a1a1a" }}
    >
      <span className="text-xs text-white/40">Loading…</span>
    </div>
  );
}

function LazyTemplatedDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref}>
      {visible ? (
        <Suspense fallback={<DemoPlaceholder />}>
          <TemplatedRenderingDemo />
        </Suspense>
      ) : (
        <DemoPlaceholder />
      )}
    </div>
  );
}

export function TemplatedRenderingSection() {
  return (
    <section className="relative py-16 bg-[var(--poster-gold)] dark:bg-[#3a2e1a] overflow-hidden">
      {/* Multiplication/repeat pattern - one to many */}
      <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/4 w-[500px] h-[500px] opacity-[0.08]" aria-hidden="true">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* One square becoming many */}
          <rect x="10" y="40" width="20" height="20" fill="currentColor" />
          <path d="M40,50 L55,50" stroke="currentColor" strokeWidth="4" />
          <polygon points="55,45 65,50 55,55" fill="currentColor" />
          <rect x="70" y="20" width="15" height="15" fill="currentColor" />
          <rect x="70" y="42" width="15" height="15" fill="currentColor" />
          <rect x="70" y="65" width="15" height="15" fill="currentColor" />
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-black dark:bg-white flex items-center justify-center">
              <span className="text-[var(--poster-gold)] dark:text-[#3a2e1a] text-xl font-black">&times;</span>
            </div>
            <span className="text-sm font-bold uppercase tracking-widest text-black/60 dark:text-white/60">
              Data-Driven
            </span>
          </div>

          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tighter uppercase text-black dark:text-white mb-3">
            One template, infinite videos
          </h2>

          <p className="text-lg text-black/70 dark:text-white/70 max-w-2xl">
            Define your video once. Pass different data via CLI or API.
            Render thousands of personalized videos automatically.
          </p>
        </div>

        {/* Demo */}
        <LazyTemplatedDemo />

        {/* CTA */}
        <div className="mt-8 text-center">
          <Link
            to="/skills"
            className="inline-flex items-center px-8 py-4 bg-black dark:bg-white text-[var(--poster-gold)] dark:text-[#3a2e1a] font-bold text-sm uppercase tracking-wider hover:bg-[var(--ink-black)] dark:hover:bg-white/90 transition-colors shadow-poster-hard"
          >
            Explore docs
            <svg className="ml-3 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
