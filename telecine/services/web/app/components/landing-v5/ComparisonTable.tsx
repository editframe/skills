/* ==============================================================================
   COMPONENT: ComparisonTable
   
   Purpose: Honest comparison with alternatives. Technical evaluators will
   compare anyway - better we control the narrative with facts.
   
   Implementation notes:
   - Be factual, not promotional
   - Acknowledge where alternatives are stronger
   - Link to sources where possible
   - Mobile: transform to cards, not horizontal scroll
   ============================================================================== */

/**
 * ComparisonTable displays a feature comparison between Editframe and alternatives
 * like Remotion and FFmpeg.
 */
export function ComparisonTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800">
            <th className="text-left py-4 px-4 font-semibold text-slate-900 dark:text-white">Feature</th>
            <th className="text-center py-4 px-4 font-semibold text-emerald-600 dark:text-emerald-400">Editframe</th>
            <th className="text-center py-4 px-4 font-semibold text-slate-500">Remotion</th>
            <th className="text-center py-4 px-4 font-semibold text-slate-500">FFmpeg</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {[
            { feature: 'React components', editframe: true, remotion: true, ffmpeg: false },
            { feature: 'Web Components', editframe: true, remotion: false, ffmpeg: false },
            { feature: 'Instant preview', editframe: true, remotion: 'Partial', ffmpeg: false },
            { feature: 'Cloud rendering', editframe: true, remotion: 'Self-host', ffmpeg: 'Self-host' },
            { feature: 'Auto captions', editframe: true, remotion: false, ffmpeg: false },
            { feature: 'Timeline GUI', editframe: true, remotion: false, ffmpeg: false },
            { feature: 'Open source', editframe: true, remotion: true, ffmpeg: true },
          ].map((row, i) => (
            <tr key={i}>
              <td className="py-4 px-4 text-slate-600 dark:text-slate-400">{row.feature}</td>
              <td className="py-4 px-4 text-center">
                {row.editframe === true ? (
                  <svg className="w-5 h-5 text-emerald-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : row.editframe === false ? (
                  <svg className="w-5 h-5 text-slate-300 dark:text-slate-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <span className="text-sm text-slate-500">{row.editframe}</span>
                )}
              </td>
              <td className="py-4 px-4 text-center">
                {row.remotion === true ? (
                  <svg className="w-5 h-5 text-emerald-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : row.remotion === false ? (
                  <svg className="w-5 h-5 text-slate-300 dark:text-slate-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <span className="text-sm text-slate-500">{row.remotion}</span>
                )}
              </td>
              <td className="py-4 px-4 text-center">
                {row.ffmpeg === true ? (
                  <svg className="w-5 h-5 text-emerald-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : row.ffmpeg === false ? (
                  <svg className="w-5 h-5 text-slate-300 dark:text-slate-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <span className="text-sm text-slate-500">{row.ffmpeg}</span>
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
