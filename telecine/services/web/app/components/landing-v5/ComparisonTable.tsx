/* ==============================================================================
   COMPONENT: ComparisonTable
   
   Purpose: Honest feature comparison. Helps developers make informed decisions.
   
   Design: Bold Swissted-inspired table with geometric icons
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
    <div className="w-6 h-6 bg-[var(--poster-blue)] flex items-center justify-center">
      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>
  );
  
  const CrossIcon = () => (
    <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </div>
  );
  
  return (
    <div className="relative">
      <div className="absolute -bottom-3 -right-3 w-full h-full bg-[var(--poster-green)]" />
      <div className="relative bg-white dark:bg-[#111] border-4 border-[var(--ink-black)] dark:border-white overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[var(--ink-black)] dark:bg-white text-white dark:text-black">
              <th className="text-left py-4 px-6 font-bold text-sm uppercase tracking-wider">Feature</th>
              <th className="text-center py-4 px-6 font-bold text-sm uppercase tracking-wider">Editframe</th>
              <th className="text-center py-4 px-6 font-bold text-sm uppercase tracking-wider">Remotion</th>
              <th className="text-center py-4 px-6 font-bold text-sm uppercase tracking-wider">FFmpeg</th>
            </tr>
          </thead>
          <tbody>
            {features.map((feature, i) => (
              <tr key={i} className="border-b-2 border-[var(--ink-black)]/10 dark:border-white/10 last:border-0">
                <td className="py-4 px-6 text-sm font-semibold">{feature.name}</td>
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
    </div>
  );
}

export { ComparisonTable };
export default ComparisonTable;
