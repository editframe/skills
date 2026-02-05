/* ==============================================================================
   COMPONENT: BeforeAfterComparison
   
   Purpose: Show the transformation. This is emotional - developers feel
   the pain of the "before" and desire the "after".
   
   Implementation notes:
   - Side-by-side panels
   - "Before" shows: complex pipeline, multiple tools, manual processes
   - "After" shows: simple code, instant feedback, one tool
   - Use visual weight to make "After" feel lighter/better
   ============================================================================== */

/**
 * BeforeAfterComparison displays a side-by-side comparison of traditional
 * video development approaches versus using Editframe.
 */
export function BeforeAfterComparison() {
  return (
    <div className="grid md:grid-cols-2 gap-8">
      {/* Before */}
      <div className="relative">
        <div className="absolute -top-3 left-6 px-3 py-1 bg-slate-200 dark:bg-slate-800 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-400">
          Traditional approach
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 h-full">
          <div className="space-y-4">
            <div className="flex items-start gap-3 text-slate-600 dark:text-slate-400">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Write FFmpeg scripts</p>
                <p className="text-sm">Learn arcane flags. Debug cryptic errors. Pray it works.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 text-slate-600 dark:text-slate-400">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Wait for renders</p>
                <p className="text-sm">Change one parameter. Render for 5 minutes. Repeat forever.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 text-slate-600 dark:text-slate-400">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Manage infrastructure</p>
                <p className="text-sm">Provision GPU servers. Handle encoding queues. Monitor everything.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 text-slate-600 dark:text-slate-400">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Count frames manually</p>
                <p className="text-sm">Calculate timestamps. Convert between formats. Make math errors.</p>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
            <p className="text-sm text-slate-500">Typical timeline: <span className="font-semibold text-red-500">2-4 weeks</span></p>
          </div>
        </div>
      </div>
      
      {/* After */}
      <div className="relative">
        <div className="absolute -top-3 left-6 px-3 py-1 bg-emerald-100 dark:bg-emerald-500/20 rounded-full text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          With Editframe
        </div>
        <div className="bg-white dark:bg-slate-900 border-2 border-emerald-200 dark:border-emerald-500/30 rounded-2xl p-8 h-full">
          <div className="space-y-4">
            <div className="flex items-start gap-3 text-slate-600 dark:text-slate-400">
              <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Write React components</p>
                <p className="text-sm">Use the skills you already have. JSX, CSS, any animation library.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 text-slate-600 dark:text-slate-400">
              <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Preview instantly</p>
                <p className="text-sm">Edit code, see video update in milliseconds. Scrub the timeline freely.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 text-slate-600 dark:text-slate-400">
              <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Render on our infrastructure</p>
                <p className="text-sm">Push to cloud. We handle scaling, encoding, and delivery.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 text-slate-600 dark:text-slate-400">
              <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Time is just a prop</p>
                <p className="text-sm">start, duration, offset. Declarative timing that makes sense.</p>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-emerald-200 dark:border-emerald-500/30">
            <p className="text-sm text-slate-500">Typical timeline: <span className="font-semibold text-emerald-600 dark:text-emerald-400">2-4 hours</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BeforeAfterComparison;
