import clsx from "clsx";
import type { NewsletterSectionProps } from "../types";

/**
 * Newsletter Section - Email signup
 * Clean, simple newsletter subscription
 */
export function NewsletterSection({
  headline,
  description,
  placeholder = "you@company.com",
  buttonLabel = "Subscribe",
}: NewsletterSectionProps) {
  return (
    <section className="relative py-16 sm:py-20 border-t border-slate-200 dark:border-slate-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl mx-auto text-center">
          <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-4">
            {headline}
          </h3>
          {description && (
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              {description}
            </p>
          )}

          <form className="flex flex-col sm:flex-row gap-3" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder={placeholder}
              className="flex-1 px-5 py-3 rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
            />
            <button
              type="submit"
              className="px-8 py-3 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
            >
              {buttonLabel}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}



