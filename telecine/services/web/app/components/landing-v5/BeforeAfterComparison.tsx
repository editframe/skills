/* ==============================================================================
   COMPONENT: BeforeAfterComparison
   
   Purpose: Show the transformation. This is emotional - developers feel
   the pain of the "before" and desire the "after".
   
   Design: International Typographic Style / Bauhaus / De Stijl
   - Bold geometric layout with grid structure
   - Primary colors (red/blue) for visual contrast
   - Strong black borders and clean typography
   ============================================================================== */

/**
 * BeforeAfterComparison displays a side-by-side comparison of traditional
 * video development approaches versus using Editframe.
 */
export function BeforeAfterComparison() {
  return (
    <div className="grid md:grid-cols-2 gap-0">
      {/* Before */}
      <div className="border-4 border-black dark:border-white">
        <div className="bg-[var(--destijl-red)] text-white p-4" style={{boxShadow: 'inset 0 0 40px rgba(0,0,0,0.1)'}}>
          <span className="text-xs font-bold uppercase tracking-[0.2em]" style={{textShadow: '0 0 0.5px currentColor'}}>Traditional Approach</span>
        </div>
        <div className="p-8 bg-white dark:bg-[#0a0a0a]">
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-[var(--destijl-red)] flex items-center justify-center" style={{boxShadow: 'inset 0 0 12px rgba(0,0,0,0.15)'}}>
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                  <path strokeLinecap="square" strokeLinejoin="miter" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <p className="font-bold uppercase tracking-wider text-sm mb-1" style={{textShadow: '0 0 0.5px currentColor'}}>Write FFmpeg scripts</p>
                <p className="text-sm opacity-70">Learn arcane flags. Debug cryptic errors.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-[var(--destijl-red)] flex items-center justify-center" style={{boxShadow: 'inset 0 0 12px rgba(0,0,0,0.15)'}}>
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                  <path strokeLinecap="square" strokeLinejoin="miter" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <p className="font-bold uppercase tracking-wider text-sm mb-1" style={{textShadow: '0 0 0.5px currentColor'}}>Wait for renders</p>
                <p className="text-sm opacity-70">Change one parameter. Render 5 minutes. Repeat.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-[var(--destijl-red)] flex items-center justify-center" style={{boxShadow: 'inset 0 0 12px rgba(0,0,0,0.15)'}}>
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                  <path strokeLinecap="square" strokeLinejoin="miter" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <p className="font-bold uppercase tracking-wider text-sm mb-1" style={{textShadow: '0 0 0.5px currentColor'}}>Manage infrastructure</p>
                <p className="text-sm opacity-70">Provision GPU servers. Handle encoding queues.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-[var(--destijl-red)] flex items-center justify-center" style={{boxShadow: 'inset 0 0 12px rgba(0,0,0,0.15)'}}>
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                  <path strokeLinecap="square" strokeLinejoin="miter" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <p className="font-bold uppercase tracking-wider text-sm mb-1" style={{textShadow: '0 0 0.5px currentColor'}}>Count frames manually</p>
                <p className="text-sm opacity-70">Calculate timestamps. Convert formats. Make errors.</p>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t-4 border-black dark:border-white">
            <p className="text-sm font-bold uppercase tracking-wider">
              Timeline: <span className="text-[var(--destijl-red)]">2-4 weeks</span>
            </p>
          </div>
        </div>
      </div>
      
      {/* After */}
      <div className="border-4 border-l-0 border-black dark:border-white">
        <div className="bg-[var(--destijl-blue)] text-white p-4" style={{boxShadow: 'inset 0 0 40px rgba(0,0,0,0.1)'}}>
          <span className="text-xs font-bold uppercase tracking-[0.2em]" style={{textShadow: '0 0 0.5px currentColor'}}>With Editframe</span>
        </div>
        <div className="p-8 bg-white dark:bg-[#0a0a0a]">
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-[var(--destijl-blue)] flex items-center justify-center" style={{boxShadow: 'inset 0 0 12px rgba(0,0,0,0.15)'}}>
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                  <path strokeLinecap="square" strokeLinejoin="miter" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-bold uppercase tracking-wider text-sm mb-1" style={{textShadow: '0 0 0.5px currentColor'}}>Write React components</p>
                <p className="text-sm opacity-70">Use skills you have. JSX, CSS, any animation library.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-[var(--destijl-blue)] flex items-center justify-center" style={{boxShadow: 'inset 0 0 12px rgba(0,0,0,0.15)'}}>
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                  <path strokeLinecap="square" strokeLinejoin="miter" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-bold uppercase tracking-wider text-sm mb-1" style={{textShadow: '0 0 0.5px currentColor'}}>Preview instantly</p>
                <p className="text-sm opacity-70">Edit code, see video update in milliseconds.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-[var(--destijl-blue)] flex items-center justify-center" style={{boxShadow: 'inset 0 0 12px rgba(0,0,0,0.15)'}}>
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                  <path strokeLinecap="square" strokeLinejoin="miter" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-bold uppercase tracking-wider text-sm mb-1" style={{textShadow: '0 0 0.5px currentColor'}}>Render on our infrastructure</p>
                <p className="text-sm opacity-70">Push to cloud. We handle scaling and delivery.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-[var(--destijl-blue)] flex items-center justify-center" style={{boxShadow: 'inset 0 0 12px rgba(0,0,0,0.15)'}}>
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                  <path strokeLinecap="square" strokeLinejoin="miter" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-bold uppercase tracking-wider text-sm mb-1" style={{textShadow: '0 0 0.5px currentColor'}}>Time is just a prop</p>
                <p className="text-sm opacity-70">start, duration, offset. Declarative timing.</p>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t-4 border-black dark:border-white">
            <p className="text-sm font-bold uppercase tracking-wider">
              Timeline: <span className="text-[var(--destijl-blue)]">2-4 hours</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BeforeAfterComparison;
