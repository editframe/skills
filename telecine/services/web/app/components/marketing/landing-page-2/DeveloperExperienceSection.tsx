import { themeClasses } from "~/utils/theme-classes";
import { typographyClasses } from "~/utils/typography";
import clsx from "clsx";
import type { DeveloperExperienceSectionProps } from "./types";

/**
 * Developer Experience section - Build with confidence, ship with speed
 * Builds confidence through familiar, professional tooling
 */
export function DeveloperExperienceSection({
  headline = "Build with confidence, ship with speed",
  description,
  features = [],
}: DeveloperExperienceSectionProps) {
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

        {features && features.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className={clsx(
                  "rounded-xl p-6 sm:p-8 border",
                  "bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm",
                  "border-slate-300/75 dark:border-slate-700/75",
                  "shadow-[0_1px_2px_0_rgb(0_0_0_/_0.08),0_4px_12px_0_rgb(0_0_0_/_0.12)]",
                  "dark:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.4),0_4px_12px_0_rgb(0_0_0_/_0.5)]",
                  "hover:shadow-md transition-all duration-150",
                  "relative before:absolute before:inset-0 before:rounded-xl",
                  "before:bg-gradient-to-br before:from-amber-50/25 before:via-transparent before:to-transparent",
                  "before:dark:from-blue-950/18 before:pointer-events-none"
                )}
              >
                {feature.icon && (
                  <div className="mb-4 flex items-center justify-center w-12 h-12 rounded-lg bg-blue-600 dark:bg-blue-500">
                    {feature.icon}
                  </div>
                )}
                <h3
                  className={clsx(
                    "text-lg sm:text-xl font-semibold mb-3",
                    themeClasses.pageText
                  )}
                >
                  {feature.title}
                </h3>
                <p
                  className={clsx(
                    "text-sm leading-relaxed",
                    themeClasses.pageTextSecondary
                  )}
                >
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}








