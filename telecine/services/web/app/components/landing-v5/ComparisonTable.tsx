/* ==============================================================================
   COMPONENT: ComparisonTable
   
   Purpose: Honest feature comparison. Helps developers make informed decisions.
   
   Design: Clean table with subtle styling
   ============================================================================== */

function ComparisonTable() {
  const features = [
    { name: 'React components', editframe: true, remotion: true, ffmpeg: false },
    { name: 'Instant preview', editframe: true, remotion: false, ffmpeg: false },
    { name: 'Cloud rendering', editframe: true, remotion: true, ffmpeg: false },
    { name: 'Parallel encoding', editframe: true, remotion: true, ffmpeg: false },
    { name: 'Managed infrastructure', editframe: true, remotion: false, ffmpeg: false },
    { name: 'No bundle required', editframe: true, remotion: false, ffmpeg: true },
    { name: 'Sub-second preview', editframe: true, remotion: false, ffmpeg: false },
    { name: 'TypeScript support', editframe: true, remotion: true, ffmpeg: false },
  ];
  
  const CheckIcon = () => (
    <div className="w-6 h-6 rounded-full bg-[var(--accent-blue)]/10 flex items-center justify-center">
      <svg className="w-3.5 h-3.5 text-[var(--accent-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>
  );
  
  const CrossIcon = () => (
    <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
      <svg className="w-3.5 h-3.5 text-[var(--warm-gray)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </div>
  );
  
  return (
    <div className="bg-white dark:bg-[#111] rounded shadow-print overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-rule">
            <th className="text-left py-4 px-6 font-semibold text-sm">Feature</th>
            <th className="text-center py-4 px-6 font-semibold text-sm text-[var(--accent-blue)]">Editframe</th>
            <th className="text-center py-4 px-6 font-semibold text-sm text-[var(--warm-gray)]">Remotion</th>
            <th className="text-center py-4 px-6 font-semibold text-sm text-[var(--warm-gray)]">FFmpeg</th>
          </tr>
        </thead>
        <tbody>
          {features.map((feature, i) => (
            <tr key={i} className="border-b border-rule last:border-0">
              <td className="py-4 px-6 text-sm">{feature.name}</td>
              <td className="py-4 px-6">
                <div className="flex justify-center">
                  {feature.editframe ? <CheckIcon /> : <CrossIcon />}
                </div>
              </td>
              <td className="py-4 px-6">
                <div className="flex justify-center">
                  {feature.remotion ? <CheckIcon /> : <CrossIcon />}
                </div>
              </td>
              <td className="py-4 px-6">
                <div className="flex justify-center">
                  {feature.ffmpeg ? <CheckIcon /> : <CrossIcon />}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { ComparisonTable };
export default ComparisonTable;
