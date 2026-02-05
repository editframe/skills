/* ==============================================================================
   COMPONENT: Testimonials
   
   Purpose: Specific praise from real users. More credible than claims.
   
   Design: Bold Swissted-inspired cards with geometric accents
   ============================================================================== */

const testimonials = [
  {
    quote: "We went from 'video is too hard' to shipping our first video feature in a week. The instant preview changed how we iterate.",
    name: "Alex Chen",
    title: "Senior Engineer",
    company: "TechCorp",
    color: 'var(--poster-gold)',
  },
  {
    quote: "Finally, video development that feels like web development. React components, CSS animations, TypeScript - all the tools I already know.",
    name: "Sarah Kim",
    title: "Lead Developer",
    company: "StartupXYZ",
    color: 'var(--poster-pink)',
  },
];

export function Testimonials() {
  return (
    <div className="grid md:grid-cols-2 gap-8">
      {testimonials.map((testimonial, i) => (
        <div key={i} className="relative">
          {/* Offset shadow with testimonial color */}
          <div className="absolute -bottom-3 -right-3 w-full h-full" style={{ backgroundColor: testimonial.color }} />
          <div className="relative bg-white dark:bg-[#111] border-4 border-[var(--ink-black)] dark:border-white p-8">
            {/* Large quote mark */}
            <div className="text-[120px] font-black leading-none -mt-8 -mb-12 opacity-10" style={{ color: testimonial.color }}>
              "
            </div>
            
            <p className="text-lg leading-relaxed mb-8 relative">
              {testimonial.quote}
            </p>
            
            <div className="flex items-center gap-4 pt-6 border-t-2 border-[var(--ink-black)] dark:border-white">
              {/* Geometric avatar */}
              <div className="w-12 h-12" style={{ backgroundColor: testimonial.color }} />
              <div>
                <p className="font-bold text-sm uppercase tracking-wider">{testimonial.name}</p>
                <p className="text-xs text-[var(--warm-gray)] uppercase tracking-wide">{testimonial.title}, {testimonial.company}</p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default Testimonials;
