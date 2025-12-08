import { themeClasses } from "~/utils/theme-classes";
import { typographyClasses } from "~/utils/typography";
import clsx from "clsx";
import type { RenderingSectionProps } from "./types";

/**
 * Rendering section - Fast rendering, faster shipping
 * Shows speed as competitive advantage (ship faster = get paid faster)
 */
export function RenderingSection({
  headline = "Fast rendering, faster shipping",
  description,
  metrics = [],
  benefits = [],
}: RenderingSectionProps) {
  return (
    <section
      className={clsx(
        "relative py-12 sm:py-16 lg:py-20 border-t",
        themeClasses.pageBg,
        themeClasses.pageBorder
      )}
    >
      <div className="max-w-6xl mx-auto">
        {headline && (
          <div className="text-center mb-8 sm:mb-12">
            <h2
              className={clsx(
                typographyClasses.h2NoSpacing,
                "text-3xl sm:text-4xl font-bold mb-4",
                themeClasses.pageText
              )}
            >
              {headline}
            </h2>
            {description && (
              <p
                className={clsx(
                  typographyClasses.lead,
                  "text-base sm:text-lg max-w-3xl mx-auto",
                  themeClasses.pageTextSecondary
                )}
              >
                {description}
              </p>
            )}
          </div>
        )}

        {metrics && metrics.length > 0 && (
          <div className="grid sm:grid-cols-3 gap-6 sm:gap-8 mb-12 sm:mb-16">
            {metrics.map((metric, index) => (
              <div
                key={index}
                className={clsx(
                  "rounded-xl p-6 sm:p-8 border text-center",
                  "bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-800",
                  "border-blue-200 dark:border-blue-800",
                  "shadow-lg"
                )}
              >
                <div
                  className={clsx(
                    "text-3xl sm:text-4xl lg:text-5xl font-bold mb-2",
                    "text-blue-600 dark:text-blue-400"
                  )}
                >
                  {metric.value}
                </div>
                <div
                  className={clsx(
                    "text-sm sm:text-base",
                    themeClasses.pageTextSecondary
                  )}
                >
                  {metric.label}
                </div>
              </div>
            ))}
          </div>
        )}

        {benefits && benefits.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className={clsx(
                  "rounded-xl p-6 sm:p-8 border",
                  "bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm",
                  "border-slate-300/75 dark:border-slate-700/75",
                  "shadow-[0_1px_2px_0_rgb(0_0_0_/_0.08),0_4px_12px_0_rgb(0_0_0_/_0.12)]",
                  "dark:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.4),0_4px_12px_0_rgb(0_0_0_/_0.5)]",
                  "hover:shadow-md transition-all duration-150"
                )}
              >
                <h3
                  className={clsx(
                    "text-lg sm:text-xl font-semibold mb-3",
                    themeClasses.pageText
                  )}
                >
                  {benefit.title}
                </h3>
                <p
                  className={clsx(
                    "text-sm leading-relaxed",
                    themeClasses.pageTextSecondary
                  )}
                >
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}








