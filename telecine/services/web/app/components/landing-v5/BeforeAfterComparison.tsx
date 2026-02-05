/* ==============================================================================
   COMPONENT: BeforeAfterComparison
   
   Purpose: Show the transformation. This is emotional - developers feel
   the pain of the "before" and desire the "after".
   
   Design: Clean, sophisticated comparison with subtle color accents
   ============================================================================== */

export function BeforeAfterComparison() {
  return (
    <div className="grid md:grid-cols-2 gap-8">
      {/* Before */}
      <div className="relative bg-white dark:bg-[#111] rounded shadow-print overflow-hidden">
        {/* Accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--accent-red)] to-[var(--accent-red)]/50" />
        
        <div className="p-8">
          <span className="inline-block text-xs font-semibold text-[var(--accent-red)] uppercase tracking-wider mb-6">
            Traditional Approach
          </span>
          
          <div className="space-y-5">
            {[
              { title: 'Write FFmpeg scripts', desc: 'Learn arcane flags. Debug cryptic errors.' },
              { title: 'Wait for renders', desc: 'Change one parameter. Render 5 minutes. Repeat.' },
              { title: 'Manage infrastructure', desc: 'Provision GPU servers. Handle encoding queues.' },
              { title: 'Count frames manually', desc: 'Calculate timestamps. Convert formats. Make errors.' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--accent-red)]/10 flex items-center justify-center mt-0.5">
                  <svg className="w-3 h-3 text-[var(--accent-red)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-sm mb-0.5">{item.title}</p>
                  <p className="text-sm text-[var(--warm-gray)]">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-8 pt-6 border-t border-rule">
            <p className="text-sm">
              Timeline: <span className="font-semibold text-[var(--accent-red)]">2-4 weeks</span>
            </p>
          </div>
        </div>
      </div>
      
      {/* After */}
      <div className="relative bg-white dark:bg-[#111] rounded shadow-print overflow-hidden">
        {/* Accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-blue)]/50" />
        
        <div className="p-8">
          <span className="inline-block text-xs font-semibold text-[var(--accent-blue)] uppercase tracking-wider mb-6">
            With Editframe
          </span>
          
          <div className="space-y-5">
            {[
              { title: 'Write React components', desc: 'Use skills you have. JSX, CSS, any animation library.' },
              { title: 'Preview instantly', desc: 'Edit code, see video update in milliseconds.' },
              { title: 'Render on our infrastructure', desc: 'Push to cloud. We handle scaling and delivery.' },
              { title: 'Time is just a prop', desc: 'start, duration, offset. Declarative timing.' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--accent-blue)]/10 flex items-center justify-center mt-0.5">
                  <svg className="w-3 h-3 text-[var(--accent-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-sm mb-0.5">{item.title}</p>
                  <p className="text-sm text-[var(--warm-gray)]">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-8 pt-6 border-t border-rule">
            <p className="text-sm">
              Timeline: <span className="font-semibold text-[var(--accent-blue)]">2-4 hours</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BeforeAfterComparison;
