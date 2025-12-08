import { Link } from "react-router";
import clsx from "clsx";
import type { FinalCTASectionProps } from "./types";

/**
 * Final CTA section with prominent action buttons
 */
export function FinalCTASection({
  headline,
  primaryCTA,
  secondaryCTA,
}: FinalCTASectionProps) {
  return (
    <section className="py-16 sm:py-20 bg-slate-900 dark:bg-slate-950">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white">
          {headline}
        </h2>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to={primaryCTA.href}
            className={clsx(
              "px-8 py-3.5 rounded-lg font-semibold text-base",
              "bg-blue-600 hover:bg-blue-500 text-white",
              "shadow-lg shadow-blue-600/25",
              "transition-all duration-200"
            )}
          >
            {primaryCTA.label}
          </Link>
          {secondaryCTA && (
            <Link
              to={secondaryCTA.href}
              className={clsx(
                "px-8 py-3.5 rounded-lg font-semibold text-base",
                "bg-transparent text-white",
                "border border-slate-600 hover:border-slate-500",
                "transition-all duration-200"
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








