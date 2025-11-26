import { Link } from "react-router";
import { themeClasses } from "~/utils/theme-classes";
import { typographyClasses } from "~/utils/typography";
import clsx from "clsx";
import type { GetStartedSectionProps } from "./types";

/**
 * Get Started section - Lower barrier to trying, reduce risk of starting
 * Final CTA with low-barrier messaging
 */
export function GetStartedSection({
  headline = "Start building in minutes",
  description,
  primaryCTA = { label: "Get Started Free", href: "/welcome" },
  secondaryCTA = { label: "View Documentation", href: "/docs" },
  benefits = [],
}: GetStartedSectionProps) {
  return (
    <section
      className={clsx(
        "relative py-12 sm:py-16 lg:py-20 border-t",
        themeClasses.pageBg,
        themeClasses.pageBorder
      )}
    >
      <div className="max-w-4xl mx-auto text-center">
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
              "text-base sm:text-lg mb-8 max-w-2xl mx-auto",
              themeClasses.pageTextSecondary
            )}
          >
            {description}
          </p>
        )}

        {benefits && benefits.length > 0 && (
          <div className="flex flex-wrap justify-center gap-4 mb-8 text-sm sm:text-base">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className={clsx(
                  "px-4 py-2 rounded-full",
                  "bg-green-50 dark:bg-green-950/30",
                  "border border-green-200 dark:border-green-800",
                  "text-green-700 dark:text-green-300"
                )}
              >
                {benefit}
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to={primaryCTA.href}
            className={clsx(
              "px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold text-base sm:text-lg",
              "bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600",
              "text-white shadow-lg hover:shadow-xl transition-all",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            )}
          >
            {primaryCTA.label}
          </Link>
          {secondaryCTA && (
            <Link
              to={secondaryCTA.href}
              className={clsx(
                "px-6 sm:px-8 py-3 sm:py-4 border-2 rounded-lg font-semibold text-base sm:text-lg",
                "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700",
                themeClasses.pageText,
                "shadow-sm hover:shadow-md transition-all",
                "hover:border-slate-400 dark:hover:border-slate-600",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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



