/* ==============================================================================
   COMPONENT: CustomerLogos
   
   Purpose: Social proof through recognizable brands.
   
   Design: Bold Swissted-inspired logo bar with geometric accents
   ============================================================================== */

function CustomerLogos() {
  return (
    <div>
      <div className="flex items-center justify-center gap-4 mb-8">
        <div className="w-8 h-1 bg-[var(--poster-gold)]" />
        <p className="text-sm font-bold uppercase tracking-wider text-[var(--warm-gray)]">
          Trusted by teams at
        </p>
        <div className="w-8 h-1 bg-[var(--poster-gold)]" />
      </div>
      <div className="flex items-center justify-center gap-12 flex-wrap">
        {["Company A", "Company B", "Company C", "Company D", "Company E"].map(
          (name, i) => (
            <div
              key={i}
              className="text-lg font-black uppercase tracking-tight text-[var(--ink-black)] dark:text-white opacity-40 hover:opacity-100 transition-opacity"
            >
              {name}
            </div>
          ),
        )}
      </div>
    </div>
  );
}

export { CustomerLogos };
export default CustomerLogos;
