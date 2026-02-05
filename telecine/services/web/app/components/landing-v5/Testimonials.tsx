/* ==============================================================================
   COMPONENT: Testimonials
   
   Purpose: Specific praise from real users. More credible than claims.
   
   Design: International Typographic Style / Bauhaus / De Stijl
   - Grid layout with bold borders
   - Primary color accents
   - Strong typographic hierarchy
   ============================================================================== */

const testimonials = [
  {
    quote: "We went from 'video is too hard' to shipping our first video feature in a week. The instant preview changed how we iterate.",
    name: "Alex Chen",
    title: "Senior Engineer",
    company: "TechCorp",
    color: 'red' as const,
  },
  {
    quote: "Finally, video development that feels like web development. React components, CSS animations, TypeScript - all the tools I already know.",
    name: "Sarah Kim",
    title: "Lead Developer",
    company: "StartupXYZ",
    color: 'blue' as const,
  },
];

export function Testimonials() {
  return (
    <div className="grid md:grid-cols-2 gap-0">
      {testimonials.map((testimonial, i) => (
        <div key={i} className={`border-4 border-black dark:border-white ${i > 0 ? 'md:border-l-0' : ''} bg-white dark:bg-[#0a0a0a]`}>
          {/* Color accent bar with ink texture */}
          <div 
            className={`h-3 ${testimonial.color === 'red' ? 'bg-[var(--destijl-red)]' : 'bg-[var(--destijl-blue)]'}`}
            style={{boxShadow: 'inset 0 0 15px rgba(0,0,0,0.1)'}}
          />
          
          <div className="p-8">
            {/* Large quote mark with letterpress effect */}
            <div 
              className={`text-6xl font-black leading-none mb-4 ${testimonial.color === 'red' ? 'text-[var(--destijl-red)]' : 'text-[var(--destijl-blue)]'}`}
              style={{textShadow: '-1px -1px 0 rgba(0,0,0,0.1), 1px 1px 0 rgba(255,255,255,0.2)'}}
            >
              "
            </div>
            <p className="text-lg font-medium mb-8 leading-relaxed" style={{textShadow: '0 0 0.5px currentColor'}}>
              {testimonial.quote}
            </p>
            <div className="flex items-center gap-4">
              <div 
                className={`w-12 h-12 ${testimonial.color === 'red' ? 'bg-[var(--destijl-red)]' : 'bg-[var(--destijl-blue)]'}`}
                style={{boxShadow: 'inset 0 0 20px rgba(0,0,0,0.15)'}}
              />
              <div>
                <p className="font-bold uppercase tracking-wider text-sm" style={{textShadow: '0 0 0.5px currentColor'}}>{testimonial.name}</p>
                <p className="text-xs uppercase tracking-wider opacity-60">{testimonial.title}, {testimonial.company}</p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default Testimonials;
