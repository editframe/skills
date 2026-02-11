export function CompositionModelSection() {
  return (
    <div className="relative py-16 bg-[var(--paper-cream)]">
      <div className="max-w-4xl mx-auto px-6">
        <div className="bg-[var(--card-bg)] border-4 border-[var(--ink-black)] dark:border-white p-8 md:p-12">
          <div className="flex items-start gap-6">
            {/* Tree icon */}
            <div className="hidden md:block flex-shrink-0">
              <svg className="w-16 h-16 text-[var(--poster-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-2xl md:text-3xl font-black tracking-tighter uppercase mb-4">
                Component trees = Timelines
              </h3>
              <p className="text-lg text-[var(--warm-gray)] leading-relaxed mb-4">
                Compositions are React component trees where nesting defines the timeline. 
                Parent durations contain children. It's just JSX.
              </p>
              <div className="flex items-center gap-2 text-sm text-[var(--warm-gray)]">
                <div className="w-8 h-1 bg-[var(--poster-blue)]" />
                <span>No new paradigms. No DSL. Just React.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
