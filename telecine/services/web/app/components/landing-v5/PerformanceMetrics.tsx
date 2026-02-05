/* ==============================================================================
   COMPONENT: PerformanceMetrics
   
   Purpose: Back up claims with real numbers. Technical buyers need proof.
   
   Design: Clean metric cards with subtle color accents
   ============================================================================== */

function PerformanceMetrics() {
  const metrics = [
    {
      value: '< 50ms',
      label: 'Preview latency',
      context: 'Seek-to-display time',
    },
    {
      value: '120 fps',
      label: 'Encoding speed',
      context: '1080p H.264',
    },
    {
      value: '10,000+',
      label: 'Videos per hour',
      context: 'Cloud rendering',
    },
    {
      value: '99.9%',
      label: 'Uptime SLA',
      context: 'Enterprise tier',
    },
  ];
  
  return (
    <div className="space-y-4">
      {metrics.map((metric, i) => (
        <div key={i} className="p-4 bg-white dark:bg-[#111] rounded shadow-print">
          <div className="text-2xl font-bold tracking-tight text-[var(--accent-gold)]">
            {metric.value}
          </div>
          <div className="font-medium text-sm mt-1">
            {metric.label}
          </div>
          <div className="text-xs text-[var(--warm-gray)]">
            {metric.context}
          </div>
        </div>
      ))}
    </div>
  );
}

export { PerformanceMetrics };
export default PerformanceMetrics;
