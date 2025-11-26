import { Link } from "react-router";
import clsx from "clsx";
import type { DeveloperSectionProps } from "./types";

/**
 * Developer-focused section with testimonial cards
 */
export function DeveloperSection({
  headline,
  subheadline,
  testimonials,
  communityCTA,
}: DeveloperSectionProps) {
  return (
    <section className="py-16 sm:py-20 border-t border-slate-200 dark:border-slate-800">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-3 gap-12">
          {/* Left - Headline and CTA */}
          <div className="lg:col-span-1">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
              {headline}
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
              {subheadline}
            </p>
            {communityCTA && (
              <div className="mt-8">
                <Link
                  to={communityCTA.href}
                  className={clsx(
                    "inline-flex items-center gap-2 px-6 py-3 rounded-lg",
                    "bg-slate-900 dark:bg-white text-white dark:text-slate-900",
                    "font-semibold hover:bg-slate-800 dark:hover:bg-slate-100",
                    "transition-colors"
                  )}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                  {communityCTA.label}
                </Link>
              </div>
            )}
          </div>

          {/* Right - Testimonial Cards */}
          <div className="lg:col-span-2 grid sm:grid-cols-2 gap-6">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className={clsx(
                  "p-6 rounded-xl",
                  "bg-white dark:bg-slate-800",
                  "border border-slate-200 dark:border-slate-700",
                  "shadow-sm hover:shadow-md transition-shadow"
                )}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                    {testimonial.author.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white text-sm">
                      {testimonial.author}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {testimonial.role}
                    </p>
                  </div>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                  "{testimonial.quote}"
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}



