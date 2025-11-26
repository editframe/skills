import { themeClasses } from "~/utils/theme-classes";
import { typographyClasses } from "~/utils/typography";
import clsx from "clsx";
import type { InfrastructureSectionProps } from "./types";

/**
 * Infrastructure section - Zero infrastructure, infinite scale
 * Reduces risk by eliminating operational complexity
 */
export function InfrastructureSection({
  headline = "Zero infrastructure, infinite scale",
  description,
  benefits = [],
}: InfrastructureSectionProps) {
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

        {/* API Call Visualization */}
        <div className="mb-12 sm:mb-16">
          <div
            className={clsx(
              "rounded-xl p-6 sm:p-8 border",
              "bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-800",
              "border-blue-200 dark:border-blue-800",
              "shadow-lg"
            )}
          >
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-8">
              <div className="flex-1">
                <div
                  className={clsx(
                    "rounded-lg p-4 sm:p-6",
                    "bg-white dark:bg-slate-900",
                    "border border-slate-200 dark:border-slate-700",
                    "shadow-sm"
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={clsx(
                        "text-xs font-mono px-2 py-1 rounded",
                        "bg-green-100 dark:bg-green-900/30",
                        "text-green-700 dark:text-green-400"
                      )}
                    >
                      POST
                    </span>
                    <code
                      className={clsx(
                        "text-sm sm:text-base font-mono",
                        themeClasses.pageText
                      )}
                    >
                      /v2/videos
                    </code>
                  </div>
                  <p
                    className={clsx(
                      "text-xs sm:text-sm",
                      themeClasses.pageTextSecondary
                    )}
                  >
                    Simple API call
                  </p>
                </div>
              </div>

              <div className="flex-shrink-0">
                <div
                  className={clsx(
                    "w-12 h-12 rounded-full flex items-center justify-center",
                    "bg-blue-600 dark:bg-blue-500",
                    "text-white text-xl font-bold"
                  )}
                >
                  →
                </div>
              </div>

              <div className="flex-1">
                <div
                  className={clsx(
                    "rounded-lg p-4 sm:p-6",
                    "bg-white dark:bg-slate-900",
                    "border border-slate-200 dark:border-slate-700",
                    "shadow-sm"
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={clsx(
                        "text-xs font-mono px-2 py-1 rounded",
                        "bg-blue-100 dark:bg-blue-900/30",
                        "text-blue-700 dark:text-blue-400"
                      )}
                    >
                      VIDEO
                    </span>
                    <code
                      className={clsx(
                        "text-sm sm:text-base font-mono",
                        themeClasses.pageText
                      )}
                    >
                      Delivered
                    </code>
                  </div>
                  <p
                    className={clsx(
                      "text-xs sm:text-sm",
                      themeClasses.pageTextSecondary
                    )}
                  >
                    No infrastructure needed
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

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



