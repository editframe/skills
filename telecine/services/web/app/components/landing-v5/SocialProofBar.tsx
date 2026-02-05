/* ==============================================================================
   COMPONENT: SocialProofBar
   
   Purpose: Quick credibility boost near the hero headline.
   
   Design: Subtle, non-intrusive
   ============================================================================== */

function SocialProofBar() {
  return (
    <div className="flex items-center gap-3 mb-8">
      <div className="flex -space-x-2">
        {[0, 1, 2, 3].map((i) => (
          <div 
            key={i} 
            className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 border-2 border-white dark:border-[#0a0a0a]"
          />
        ))}
      </div>
      <p className="text-sm text-[var(--warm-gray)]">
        Trusted by <span className="font-semibold text-[var(--ink-black)] dark:text-white">500+</span> teams
      </p>
    </div>
  );
}

export { SocialProofBar };
export default SocialProofBar;
