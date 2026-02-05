/* ==============================================================================
   COMPONENT: CustomerLogos
   
   Purpose: Third-party validation. Show who uses this.
   
   Design: International Typographic Style / Bauhaus / De Stijl
   - Bold borders and geometric layout
   - Primary color accents
   ============================================================================== */

export function CustomerLogos() {
  return (
    <div className="border-b-4 border-black dark:border-white pb-16">
      <div className="flex items-center gap-6 mb-8">
        <div className="w-4 h-4 bg-[var(--destijl-yellow)]" />
        <p className="text-xs font-bold uppercase tracking-[0.2em]">
          Trusted by developers at
        </p>
      </div>
      <div className="flex items-center justify-start gap-8 flex-wrap">
        {['Company A', 'Company B', 'Company C', 'Company D', 'Company E'].map((name, i) => (
          <div key={i} className="h-12 px-6 flex items-center justify-center border-4 border-black/20 dark:border-white/20 hover:border-black dark:hover:border-white hover:bg-[var(--destijl-yellow)] hover:text-black transition-colors">
            <span className="text-sm font-bold uppercase tracking-wider">{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CustomerLogos;
