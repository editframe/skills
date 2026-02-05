/* ==============================================================================
   COMPONENT: Testimonials
   
   Purpose: Specific praise from real users. More credible than claims.
   
   IMPLEMENTATION REQUIREMENTS:
   
   Content needed:
   - 2-3 substantive quotes from real users
   - Photo, name, title, company for each
   - Specific praise (not generic "it's great!")
   
   If no testimonials yet:
   - Show tweets/posts from early users
   - Or: show community Discord messages (with permission)
   - Or: omit section entirely (better than fake)
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
        <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8">
          <svg className="w-10 h-10 text-emerald-500/30 mb-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
          </svg>
          <p className="text-lg text-slate-700 dark:text-slate-300 mb-6 leading-relaxed">
            {testimonial.quote}
          </p>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700" />
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">{testimonial.name}</p>
              <p className="text-sm text-slate-500">{testimonial.title}, {testimonial.company}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default Testimonials;
