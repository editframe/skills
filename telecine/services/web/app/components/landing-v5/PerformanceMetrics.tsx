/* ==============================================================================
   COMPONENT: PerformanceMetrics
   
   Purpose: Back up claims with real numbers. Technical buyers need proof.
   
   Design: Bold Swissted-inspired metric cards with strong typography
   ============================================================================== */

function PerformanceMetrics() {
  const metrics = [
    {
      value: '< 50ms',
      label: 'Preview latency',
      context: 'Seek-to-display time',
      color: 'var(--poster-red)',
    },
    {
      value: '120 fps',
      label: 'Encoding speed',
      context: '1080p H.264',
      color: 'var(--poster-blue)',
    },
    {
      value: '10,000+',
      label: 'Videos per hour',
      context: 'Cloud rendering',
      color: 'var(--poster-gold)',
    },
    {
      value: '99.9%',
      label: 'Uptime SLA',
      context: 'Enterprise tier',
      color: 'var(--poster-green)',
    },
  ];
  
  return (
    <div className="space-y-3">
      {metrics.map((metric, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border-l-4" style={{ borderColor: metric.color }}>
          <div className="text-3xl font-black tracking-tighter" style={{ color: metric.color }}>
            {metric.value}
          </div>
          <div>
            <div className="font-bold text-sm uppercase tracking-wider">
              {metric.label}
            </div>
            <div className="text-xs text-[var(--warm-gray)] uppercase tracking-wide">
              {metric.context}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export { PerformanceMetrics };
export default PerformanceMetrics;
