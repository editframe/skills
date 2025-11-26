import { themeClasses } from "~/utils/theme-classes";
import { typographyClasses } from "~/utils/typography";
import clsx from "clsx";
import type { WhyChooseSectionProps } from "./types";

/**
 * Why Choose section - Three-column comparison
 * Builds confidence by addressing alternatives and reducing risk
 */
export function WhyChooseSection({
  headline = "Why choose Editframe over alternatives?",
  comparison,
}: WhyChooseSectionProps) {
  return (
    <section
      className={clsx(
        "relative py-12 sm:py-16 lg:py-20 border-t",
        themeClasses.pageBg,
        themeClasses.pageBorder
      )}
    >
      <div className="max-w-7xl mx-auto">
        {headline && (
          <div className="text-center mb-12 sm:mb-16">
            <h2
              className={clsx(
                typographyClasses.h2NoSpacing,
                "text-3xl sm:text-4xl font-bold mb-4",
                themeClasses.pageText
              )}
            >
              {headline}
            </h2>
          </div>
        )}

        <div className="grid sm:grid-cols-3 gap-6 sm:gap-8">
          {/* DIY Column */}
          <div
            className={clsx(
              "rounded-xl p-6 sm:p-8 border",
              "bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm",
              "border-slate-300/75 dark:border-slate-700/75",
              "shadow-sm"
            )}
          >
            <h3
              className={clsx(
                "text-xl sm:text-2xl font-bold mb-4",
                themeClasses.pageText
              )}
            >
              {comparison.diy.title}
            </h3>
            <div className="mb-6">
              <p
                className={clsx(
                  "text-sm font-medium mb-3",
                  themeClasses.pageTextSecondary
                )}
              >
                Pros:
              </p>
              <ul className="space-y-2">
                {comparison.diy.points.map((point, index) => (
                  <li
                    key={index}
                    className={clsx(
                      "text-sm flex items-start",
                      themeClasses.pageTextSecondary
                    )}
                  >
                    <span className="mr-2 text-green-600 dark:text-green-400">
                      ✓
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p
                className={clsx(
                  "text-sm font-medium mb-3 text-red-600 dark:text-red-400"
                )}
              >
                Risks:
              </p>
              <ul className="space-y-2">
                {comparison.diy.risks.map((risk, index) => (
                  <li
                    key={index}
                    className={clsx(
                      "text-sm flex items-start",
                      themeClasses.pageTextSecondary
                    )}
                  >
                    <span className="mr-2 text-red-600 dark:text-red-400">
                      ✗
                    </span>
                    {risk}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Competitors Column */}
          <div
            className={clsx(
              "rounded-xl p-6 sm:p-8 border",
              "bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm",
              "border-slate-300/75 dark:border-slate-700/75",
              "shadow-sm"
            )}
          >
            <h3
              className={clsx(
                "text-xl sm:text-2xl font-bold mb-4",
                themeClasses.pageText
              )}
            >
              {comparison.competitors.title}
            </h3>
            <div className="mb-6">
              <p
                className={clsx(
                  "text-sm font-medium mb-3",
                  themeClasses.pageTextSecondary
                )}
              >
                Pros:
              </p>
              <ul className="space-y-2">
                {comparison.competitors.points.map((point, index) => (
                  <li
                    key={index}
                    className={clsx(
                      "text-sm flex items-start",
                      themeClasses.pageTextSecondary
                    )}
                  >
                    <span className="mr-2 text-green-600 dark:text-green-400">
                      ✓
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p
                className={clsx(
                  "text-sm font-medium mb-3 text-red-600 dark:text-red-400"
                )}
              >
                Risks:
              </p>
              <ul className="space-y-2">
                {comparison.competitors.risks.map((risk, index) => (
                  <li
                    key={index}
                    className={clsx(
                      "text-sm flex items-start",
                      themeClasses.pageTextSecondary
                    )}
                  >
                    <span className="mr-2 text-red-600 dark:text-red-400">
                      ✗
                    </span>
                    {risk}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Editframe Column - Highlighted */}
          <div
            className={clsx(
              "rounded-xl p-6 sm:p-8 border-2",
              "bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-800",
              "border-blue-300 dark:border-blue-700",
              "shadow-lg relative",
              "before:absolute before:inset-0 before:rounded-xl",
              "before:bg-gradient-to-br before:from-blue-100/25 before:via-transparent before:to-transparent",
              "before:dark:from-blue-950/18 before:pointer-events-none"
            )}
          >
            <div className="relative z-10">
              <div className="flex items-center mb-4">
                <h3
                  className={clsx(
                    "text-xl sm:text-2xl font-bold",
                    themeClasses.pageText
                  )}
                >
                  {comparison.editframe.title}
                </h3>
                <span
                  className={clsx(
                    "ml-2 px-2 py-1 rounded text-xs font-semibold",
                    "bg-blue-600 text-white dark:bg-blue-500"
                  )}
                >
                  Best Choice
                </span>
              </div>
              <div className="mb-6">
                <p
                  className={clsx(
                    "text-sm font-medium mb-3",
                    "text-blue-700 dark:text-blue-300"
                  )}
                >
                  Key Advantages:
                </p>
                <ul className="space-y-2">
                  {comparison.editframe.points.map((point, index) => (
                    <li
                      key={index}
                      className={clsx(
                        "text-sm flex items-start font-medium",
                        themeClasses.pageText
                      )}
                    >
                      <span className="mr-2 text-blue-600 dark:text-blue-400">
                        ✓
                      </span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p
                  className={clsx(
                    "text-sm font-medium mb-3",
                    "text-blue-700 dark:text-blue-300"
                  )}
                >
                  Benefits:
                </p>
                <ul className="space-y-2">
                  {comparison.editframe.benefits.map((benefit, index) => (
                    <li
                      key={index}
                      className={clsx(
                        "text-sm flex items-start",
                        themeClasses.pageTextSecondary
                      )}
                    >
                      <span className="mr-2 text-blue-600 dark:text-blue-400">
                        ✓
                      </span>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}



