/* ==============================================================================
   COMPONENT: ArchitectureDiagram
   
   Purpose: Show how Editframe works under the hood. Technical credibility
   for developers evaluating the platform.
   
   Design: International Typographic Style / Bauhaus / De Stijl
   - Bold geometric layout with grid structure
   - Primary color accents
   - Strong black borders
   ============================================================================== */

function ArchitectureDiagram() {
  return (
    <div className="grid md:grid-cols-2 gap-0 mb-12">
      {/* Preview Pipeline */}
      <div className="border-4 border-black dark:border-white">
        <div className="bg-[var(--destijl-yellow)] p-4" style={{boxShadow: 'inset 0 0 40px rgba(0,0,0,0.08)'}}>
          <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-black flex items-center gap-3" style={{textShadow: '0 1px 0 rgba(255,255,255,0.3)'}}>
            <div className="w-4 h-4 bg-black" />
            Preview Pipeline
          </h3>
        </div>
        <div className="p-6 bg-white dark:bg-[#0a0a0a]">
          <div className="space-y-4">
            {[
              { label: 'React Components', desc: 'Your JSX code' },
              { label: 'DOM Rendering', desc: 'Browser layout engine' },
              { label: 'JIT Transcoding', desc: 'On-demand media processing' },
              { label: 'Canvas Capture', desc: 'Frame extraction' },
              { label: 'Instant Preview', desc: '< 50ms latency' },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[var(--destijl-yellow)] flex items-center justify-center text-black font-black text-sm" style={{boxShadow: 'inset 0 0 15px rgba(0,0,0,0.1)'}}>
                  {i + 1}
                </div>
                <div>
                  <p className="font-bold uppercase tracking-wider text-xs" style={{textShadow: '0 0 0.5px currentColor'}}>{step.label}</p>
                  <p className="text-xs opacity-60">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Render Pipeline */}
      <div className="border-4 border-l-0 border-black dark:border-white">
        <div className="bg-[var(--destijl-blue)] p-4" style={{boxShadow: 'inset 0 0 40px rgba(0,0,0,0.1)'}}>
          <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-white flex items-center gap-3" style={{textShadow: '0 0 0.5px currentColor'}}>
            <div className="w-4 h-4 bg-white" />
            Render Pipeline
          </h3>
        </div>
        <div className="p-6 bg-white dark:bg-[#0a0a0a]">
          <div className="space-y-4">
            {[
              { label: 'Composition', desc: 'Serialized timeline' },
              { label: 'Frame Capture', desc: 'Headless browser rendering' },
              { label: 'WebCodecs / FFmpeg', desc: 'Hardware-accelerated encoding' },
              { label: 'CDN Delivery', desc: 'Global edge distribution' },
              { label: 'Webhook', desc: 'Completion notification' },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[var(--destijl-blue)] flex items-center justify-center text-white font-black text-sm" style={{boxShadow: 'inset 0 0 15px rgba(0,0,0,0.15)'}}>
                  {i + 1}
                </div>
                <div>
                  <p className="font-bold uppercase tracking-wider text-xs" style={{textShadow: '0 0 0.5px currentColor'}}>{step.label}</p>
                  <p className="text-xs opacity-60">{step.desc}</p>
                </div>
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
