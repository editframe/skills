import { Link } from "react-router";
import clsx from "clsx";
import type { FormatsSectionProps } from "./types";

/**
 * Formats section showing supported output formats and technologies
 * Displays pills/badges in a flowing grid
 */
export function FormatsSection({
  headline,
  description,
  formats,
  learnMoreHref,
}: FormatsSectionProps) {
  const getCategoryColor = (category?: string) => {
    switch (category) {
      case "video":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      case "image":
        return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
      case "audio":
        return "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      default:
        return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
    }
  };

  return (
    <section className="py-12 sm:py-16">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          <div className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              {headline}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              {description}
            </p>
            {learnMoreHref && (
              <Link
                to={learnMoreHref}
                className="inline-flex items-center gap-1.5 text-violet-600 dark:text-violet-400 font-medium hover:underline"
              >
                See full list
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {formats.map((format, index) => (
              <span
                key={index}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-sm font-medium border",
                  getCategoryColor(format.category)
                )}
              >
                {format.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}








