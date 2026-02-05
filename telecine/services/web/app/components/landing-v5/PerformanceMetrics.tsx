/* ==============================================================================
   COMPONENT: PerformanceMetrics
   
   Purpose: Back up claims with real numbers. Technical buyers need proof.
   
   Design: International Typographic Style / Bauhaus / De Stijl
   - Bold geometric layout
   - Strong typographic hierarchy
   - Primary color accents
   ============================================================================== */

function PerformanceMetrics() {
  const metrics = [
    {
      value: '< 50ms',
      label: 'Preview latency',
      context: 'Seek-to-display time',
      color: 'red' as const,
    },
    {
      value: '120 fps',
      label: 'Encoding speed',
      context: '1080p H.264',
      color: 'blue' as const,
    },
    {
      value: '10,000+',
      label: 'Videos per hour',
      context: 'Cloud rendering',
      color: 'yellow' as const,
    },
    {
      value: '99.9%',
      label: 'Uptime SLA',
      context: 'Enterprise tier',
      color: 'blue' as const,
    },
  ];
  
  const colorMap = {
    red: 'bg-[var(--destijl-red)] text-white',
    blue: 'bg-[var(--destijl-blue)] text-white',
    yellow: 'bg-[var(--destijl-yellow)] text-black',
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-4 h-4 bg-[var(--destijl-red)]" style={{boxShadow: 'inset 0 0 8px rgba(0,0,0,0.15)'}} />
        <div className="w-4 h-4 bg-[var(--destijl-yellow)]" style={{boxShadow: 'inset 0 0 8px rgba(0,0,0,0.1)'}} />
        <div className="w-4 h-4 bg-[var(--destijl-blue)]" style={{boxShadow: 'inset 0 0 8px rgba(0,0,0,0.15)'}} />
        <span className="text-xs font-bold uppercase tracking-[0.2em]" style={{textShadow: '0 0 0.5px currentColor'}}>Performance</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {metrics.map((metric, i) => (
          <div key={i} className="border-4 border-black dark:border-white">
            <div className={`${colorMap[metric.color]} p-4`} style={{boxShadow: 'inset 0 0 30px rgba(0,0,0,0.1)'}}>
              <div className="text-3xl font-black tracking-tighter" style={{textShadow: '0 0 1px currentColor'}}>
                {metric.value}
              </div>
            </div>
            <div className="p-4 bg-white dark:bg-[#0a0a0a]">
              <div className="font-bold uppercase tracking-wider text-xs mb-1" style={{textShadow: '0 0 0.5px currentColor'}}>
                {metric.label}
              </div>
              <div className="text-xs opacity-60">
                {metric.context}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export { PerformanceMetrics };
export default PerformanceMetrics;
