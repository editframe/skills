import { themeClasses } from "~/utils/theme-classes";
import { typographyClasses } from "~/utils/typography";
import clsx from "clsx";
import type { TrustSectionProps } from "./types";

/**
 * Trust section - Choose with confidence, deploy without worry
 * Reduces reputational risk with social proof and reliability signals
 */
export function TrustSection({
  headline = "Choose with confidence, deploy without worry",
  description,
  socialProof,
  metrics = [],
  trustPoints = [],
}: TrustSectionProps) {
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

        {socialProof && (
          <div className="text-center mb-8 sm:mb-12">
            <p
              className={clsx(
                "text-lg sm:text-xl font-semibold",
                themeClasses.pageText
              )}
            >
              {socialProof}
            </p>
          </div>
        )}

        {metrics && metrics.length > 0 && (
          <div className="grid sm:grid-cols-3 gap-6 sm:gap-8 mb-12 sm:mb-16">
            {metrics.map((metric, index) => (
              <div
                key={index}
                className={clsx(
                  "rounded-xl p-6 sm:p-8 border text-center",
                  "bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm",
                  "border-slate-300/75 dark:border-slate-700/75",
                  "shadow-lg"
                )}
              >
                <div
                  className={clsx(
                    "text-2xl sm:text-3xl font-bold mb-2",
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

        {trustPoints && trustPoints.length > 0 && (
          <div className="grid sm:grid-cols-3 gap-6 sm:gap-8">
            {trustPoints.map((point, index) => (
              <div
                key={index}
                className={clsx(
                  "rounded-xl p-6 sm:p-8 border",
                  "bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-800",
                  "border-blue-200 dark:border-blue-800",
                  "shadow-sm"
                )}
              >
                <div className="flex items-start">
                  <span
                    className={clsx(
                      "mr-3 text-xl",
                      "text-blue-600 dark:text-blue-400"
                    )}
                  >
                    ✓
                  </span>
                  <p
                    className={clsx(
                      "text-sm sm:text-base font-medium",
                      themeClasses.pageText
                    )}
                  >
                    {point}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}



