/* ==============================================================================
   COMPONENT: CustomerLogos
   
   Purpose: Social proof through recognizable brands.
   
   Design: Clean, minimal logo bar
   ============================================================================== */

function CustomerLogos() {
  return (
    <div>
      <p className="text-sm font-medium text-[var(--warm-gray)] text-center mb-8">
        Trusted by teams at
      </p>
      <div className="flex items-center justify-center gap-12 flex-wrap opacity-60">
        {['Company A', 'Company B', 'Company C', 'Company D', 'Company E'].map((name, i) => (
          <div key={i} className="text-lg font-semibold text-[var(--warm-gray)]">
            {name}
          </div>
        ))}
      </div>
    </div>
  );
}

export { CustomerLogos };
export default CustomerLogos;
