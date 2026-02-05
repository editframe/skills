/* ==============================================================================
   COMPONENT: Testimonials
   
   Purpose: Specific praise from real users. More credible than claims.
   
   Design: Clean cards with subtle accents
   ============================================================================== */

const testimonials = [
  {
    quote: "We went from 'video is too hard' to shipping our first video feature in a week. The instant preview changed how we iterate.",
    name: "Alex Chen",
    title: "Senior Engineer",
    company: "TechCorp",
  },
  {
    quote: "Finally, video development that feels like web development. React components, CSS animations, TypeScript - all the tools I already know.",
    name: "Sarah Kim",
    title: "Lead Developer",
    company: "StartupXYZ",
  },
];

export function Testimonials() {
  return (
    <div className="grid md:grid-cols-2 gap-8">
      {testimonials.map((testimonial, i) => (
        <div key={i} className="relative bg-white dark:bg-[#111] rounded shadow-print p-8">
          {/* Quote mark as accent */}
          <div className="absolute top-6 right-6 text-6xl font-serif text-[var(--accent-gold)]/20 leading-none">
            "
          </div>
          
          <p className="text-lg leading-relaxed mb-8 relative">
            {testimonial.quote}
          </p>
          
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent-blue)] to-[var(--accent-blue)]/70" />
            <div>
              <p className="font-semibold text-sm">{testimonial.name}</p>
              <p className="text-xs text-[var(--warm-gray)]">{testimonial.title}, {testimonial.company}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default Testimonials;
