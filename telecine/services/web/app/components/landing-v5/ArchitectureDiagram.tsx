/* ==============================================================================
   COMPONENT: ArchitectureDiagram
   
   Purpose: Show how Editframe works under the hood. Technical credibility
   for developers evaluating the platform.
   
   Design: Clean, sophisticated with subtle color accents
   ============================================================================== */

function ArchitectureDiagram() {
  return (
    <div className="grid md:grid-cols-2 gap-8">
      {/* Preview Pipeline */}
      <div className="relative bg-white dark:bg-[#0a0a0a] rounded shadow-print overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--accent-gold)] to-[var(--accent-gold)]/50" />
        
        <div className="p-6">
          <h3 className="text-sm font-semibold text-[var(--accent-gold)] uppercase tracking-wider mb-6">
            Preview Pipeline
          </h3>
          
          <div className="space-y-4">
            {[
              { label: 'React Components', desc: 'Your JSX code' },
              { label: 'DOM Rendering', desc: 'Browser layout engine' },
              { label: 'JIT Transcoding', desc: 'On-demand media processing' },
              { label: 'Canvas Capture', desc: 'Frame extraction' },
              { label: 'Instant Preview', desc: '< 50ms latency' },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded bg-[var(--accent-gold)]/10 flex items-center justify-center text-[var(--accent-gold)] font-semibold text-sm">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{step.label}</p>
                  <p className="text-xs text-[var(--warm-gray)]">{step.desc}</p>
                </div>
                {i < 4 && (
                  <svg className="w-4 h-4 text-[var(--warm-gray)]/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Render Pipeline */}
      <div className="relative bg-white dark:bg-[#0a0a0a] rounded shadow-print overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-blue)]/50" />
        
        <div className="p-6">
          <h3 className="text-sm font-semibold text-[var(--accent-blue)] uppercase tracking-wider mb-6">
            Render Pipeline
          </h3>
          
          <div className="space-y-4">
            {[
              { label: 'Composition', desc: 'Serialized timeline' },
              { label: 'Frame Capture', desc: 'Headless browser rendering' },
              { label: 'WebCodecs / FFmpeg', desc: 'Hardware-accelerated encoding' },
              { label: 'CDN Delivery', desc: 'Global edge distribution' },
              { label: 'Webhook', desc: 'Completion notification' },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded bg-[var(--accent-blue)]/10 flex items-center justify-center text-[var(--accent-blue)] font-semibold text-sm">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{step.label}</p>
                  <p className="text-xs text-[var(--warm-gray)]">{step.desc}</p>
                </div>
                {i < 4 && (
                  <svg className="w-4 h-4 text-[var(--warm-gray)]/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export { ArchitectureDiagram };
export default ArchitectureDiagram;
