import { Link } from "react-router";
import clsx from "clsx";
import type { CTASectionProps } from "./types";

/**
 * Final CTA section - simple and focused
 */
export function CTASection({
  headline,
  description,
  primaryCTA,
  secondaryCTA,
}: CTASectionProps) {
  return (
    <section className="py-16 sm:py-24">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-4">
          {headline}
        </h2>
        {description && (
          <p className="text-slate-600 dark:text-slate-400 mb-8 text-lg">
            {description}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to={primaryCTA.href}
            className={clsx(
              "px-8 py-3 rounded-lg font-medium",
              "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white",
              "hover:from-violet-700 hover:to-fuchsia-700",
              "shadow-lg shadow-violet-500/25 transition-all"
            )}
          >
            {primaryCTA.label}
          </Link>
          {secondaryCTA && (
            <Link
              to={secondaryCTA.href}
              className={clsx(
                "px-8 py-3 rounded-lg font-medium",
                "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
                "hover:bg-slate-200 dark:hover:bg-slate-700",
                "transition-all"
              )}
            >
              {secondaryCTA.label}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}








