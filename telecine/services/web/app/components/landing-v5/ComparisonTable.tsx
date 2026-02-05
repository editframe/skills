/* ==============================================================================
   COMPONENT: ComparisonTable
   
   Purpose: Honest comparison with alternatives. Technical evaluators will
   compare anyway - better we control the narrative with facts.
   
   Design: International Typographic Style / Bauhaus / De Stijl
   - Grid-based table with bold borders
   - Primary colors for yes/no indicators
   - Strong typographic hierarchy
   ============================================================================== */

/**
 * ComparisonTable displays a feature comparison between Editframe and alternatives
 * like Remotion and FFmpeg.
 */
export function ComparisonTable() {
  return (
    <div className="border-4 border-black dark:border-white overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            <th className="text-left py-4 px-6 font-bold uppercase tracking-wider text-xs border-b-4 border-r-4 border-black dark:border-white">Feature</th>
            <th className="text-center py-4 px-6 font-bold uppercase tracking-wider text-xs border-b-4 border-r-4 border-black dark:border-white bg-[var(--destijl-blue)] text-white">Editframe</th>
            <th className="text-center py-4 px-6 font-bold uppercase tracking-wider text-xs border-b-4 border-r-4 border-black dark:border-white">Remotion</th>
            <th className="text-center py-4 px-6 font-bold uppercase tracking-wider text-xs border-b-4 border-black dark:border-white">FFmpeg</th>
          </tr>
        </thead>
        <tbody>
          {[
            { feature: 'React components', editframe: true, remotion: true, ffmpeg: false },
            { feature: 'Web Components', editframe: true, remotion: false, ffmpeg: false },
            { feature: 'Instant preview', editframe: true, remotion: 'Partial', ffmpeg: false },
            { feature: 'Cloud rendering', editframe: true, remotion: 'Self-host', ffmpeg: 'Self-host' },
            { feature: 'Auto captions', editframe: true, remotion: false, ffmpeg: false },
            { feature: 'Timeline GUI', editframe: true, remotion: false, ffmpeg: false },
            { feature: 'Managed infrastructure', editframe: true, remotion: false, ffmpeg: false },
          ].map((row, i, arr) => (
            <tr key={i}>
              <td className={`py-4 px-6 font-medium text-sm border-r-4 border-black dark:border-white ${i < arr.length - 1 ? 'border-b-2 border-b-black/20 dark:border-b-white/20' : ''}`}>
                {row.feature}
              </td>
              <td className={`py-4 px-6 text-center border-r-4 border-black dark:border-white bg-[var(--destijl-blue)]/5 ${i < arr.length - 1 ? 'border-b-2 border-b-black/20 dark:border-b-white/20' : ''}`}>
                {row.editframe === true ? (
                  <div className="w-6 h-6 bg-[var(--destijl-blue)] flex items-center justify-center mx-auto">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                      <path strokeLinecap="square" strokeLinejoin="miter" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : row.editframe === false ? (
                  <div className="w-6 h-6 bg-black/10 dark:bg-white/10 flex items-center justify-center mx-auto">
                    <svg className="w-4 h-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                      <path strokeLinecap="square" strokeLinejoin="miter" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                ) : (
                  <span className="text-xs font-bold uppercase tracking-wider opacity-70">{row.editframe}</span>
                )}
              </td>
              <td className={`py-4 px-6 text-center border-r-4 border-black dark:border-white ${i < arr.length - 1 ? 'border-b-2 border-b-black/20 dark:border-b-white/20' : ''}`}>
                {row.remotion === true ? (
                  <div className="w-6 h-6 bg-[var(--destijl-blue)] flex items-center justify-center mx-auto">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                      <path strokeLinecap="square" strokeLinejoin="miter" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : row.remotion === false ? (
                  <div className="w-6 h-6 bg-black/10 dark:bg-white/10 flex items-center justify-center mx-auto">
                    <svg className="w-4 h-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                      <path strokeLinecap="square" strokeLinejoin="miter" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                ) : (
                  <span className="text-xs font-bold uppercase tracking-wider opacity-70">{row.remotion}</span>
                )}
              </td>
              <td className={`py-4 px-6 text-center ${i < arr.length - 1 ? 'border-b-2 border-b-black/20 dark:border-b-white/20' : ''}`}>
                {row.ffmpeg === true ? (
                  <div className="w-6 h-6 bg-[var(--destijl-blue)] flex items-center justify-center mx-auto">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                      <path strokeLinecap="square" strokeLinejoin="miter" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : row.ffmpeg === false ? (
                  <div className="w-6 h-6 bg-black/10 dark:bg-white/10 flex items-center justify-center mx-auto">
                    <svg className="w-4 h-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                      <path strokeLinecap="square" strokeLinejoin="miter" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                ) : (
                  <span className="text-xs font-bold uppercase tracking-wider opacity-70">{row.ffmpeg}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ComparisonTable;
