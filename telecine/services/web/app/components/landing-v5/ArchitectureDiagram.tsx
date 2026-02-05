function ArchitectureDiagram() {
  return (
    <div className="grid md:grid-cols-2 gap-8">
      {/* Preview Pipeline */}
      <div className="relative bg-white dark:bg-[var(--card-dark-bg)] border-4 border-[var(--ink-black)] dark:border-white overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-2 bg-[var(--poster-gold)]" />
        
        <div className="p-6">
          <h3 className="text-sm font-bold text-[var(--poster-gold)] uppercase tracking-wider mb-6">
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
                <div className="flex-shrink-0 w-8 h-8 bg-[var(--poster-gold)] text-white flex items-center justify-center font-black text-sm">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm uppercase tracking-wider">{step.label}</p>
                  <p className="text-xs text-[var(--warm-gray)]">{step.desc}</p>
                </div>
                {i < 4 && (
                  <svg className="w-4 h-4 text-[var(--warm-gray)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Render Pipeline */}
      <div className="relative bg-white dark:bg-[var(--card-dark-bg)] border-4 border-[var(--ink-black)] dark:border-white overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-2 bg-[var(--poster-blue)]" />
        
        <div className="p-6">
          <h3 className="text-sm font-bold text-[var(--poster-blue)] uppercase tracking-wider mb-6">
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
                <div className="flex-shrink-0 w-8 h-8 bg-[var(--poster-blue)] text-white flex items-center justify-center font-black text-sm">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm uppercase tracking-wider">{step.label}</p>
                  <p className="text-xs text-[var(--warm-gray)]">{step.desc}</p>
                </div>
                {i < 4 && (
                  <svg className="w-4 h-4 text-[var(--warm-gray)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
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
