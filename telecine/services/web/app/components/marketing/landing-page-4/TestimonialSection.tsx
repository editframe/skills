import clsx from "clsx";
import type { TestimonialSectionProps } from "./types";

/**
 * Large testimonial section with metric highlight
 */
export function TestimonialSection({
  quote,
  author,
  role,
  company,
  metric,
  logos,
}: TestimonialSectionProps) {
  return (
    <section className="py-16 sm:py-20 border-t border-slate-200 dark:border-slate-800">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-5 gap-12 items-center">
          {/* Metric Highlight */}
          {metric && (
            <div className="lg:col-span-2 text-center lg:text-left">
              <div className="inline-block">
                <p className="text-5xl sm:text-6xl font-bold text-blue-600 dark:text-blue-400">
                  {metric.value}
                </p>
                <p className="mt-2 text-lg text-slate-600 dark:text-slate-400 font-medium">
                  {metric.label}
                </p>
              </div>
            </div>
          )}

          {/* Quote */}
          <div className={clsx("space-y-6", metric ? "lg:col-span-3" : "lg:col-span-5")}>
            <blockquote>
              <p className="text-xl sm:text-2xl text-slate-700 dark:text-slate-300 leading-relaxed">
                "{quote}"
              </p>
            </blockquote>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold">
                {author.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">{author}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {role}, {company}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Logo Cloud */}
        <div className="mt-16 pt-12 border-t border-slate-200 dark:border-slate-700">
          <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-6">
            {logos.map((logo, index) => (
              <div
                key={index}
                className="text-slate-400 dark:text-slate-500 font-semibold text-lg opacity-60 hover:opacity-100 transition-opacity"
              >
                {logo.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}



