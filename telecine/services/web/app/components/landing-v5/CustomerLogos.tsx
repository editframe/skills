/* ==============================================================================
   COMPONENT: CustomerLogos
   
   Purpose: Third-party validation. Show who uses this.
   
   IMPLEMENTATION REQUIREMENTS:
   
   Content needed:
   - 4-8 customer logos (need permission to use)
   - SVG format for crisp rendering
   - Grayscale with hover color effect
   
   If no real customers yet:
   - Show "Trusted by teams at" with generic descriptors
   - Or: show community metrics instead (GitHub, Discord, npm)
   ============================================================================== */

export function CustomerLogos() {
  // TODO: Replace with real customer logos once available
  // For now, show community metrics as social proof
  return (
    <div className="text-center mb-16">
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 uppercase tracking-wider font-medium">
        Trusted by developers at
      </p>
      <div className="flex items-center justify-center gap-12 flex-wrap opacity-60 grayscale">
        {/* Placeholder logos - replace with real customer logos */}
        {['Company A', 'Company B', 'Company C', 'Company D', 'Company E'].map((name, i) => (
          <div key={i} className="h-8 px-4 flex items-center justify-center">
            <span className="text-lg font-semibold text-slate-400">{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CustomerLogos;
