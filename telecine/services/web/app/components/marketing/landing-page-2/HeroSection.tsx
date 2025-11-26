import { Link } from "react-router";
import { themeClasses } from "~/utils/theme-classes";
import { typographyClasses } from "~/utils/typography";
import clsx from "clsx";
import type { HeroSectionProps } from "./types";

/**
 * Hero section - Main headline and primary CTAs
 * Activates reader's imagination by showing the outcome: shipping features that get you paid
 */
export function HeroSection({
  headline,
  subheadline,
  description,
  primaryCTA = { label: "Start Building", href: "/welcome" },
  secondaryCTA = { label: "See How It Works", href: "/docs" },
  trustSignals = [],
}: HeroSectionProps) {
  return (
    <section className="relative py-12 sm:py-16 lg:py-20">
      <div className="max-w-5xl mx-auto text-center">
        <h1
          className={clsx(
            typographyClasses.h1NoSpacing,
            "text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-6",
            themeClasses.pageText
          )}
        >
          {headline}
        </h1>

        {subheadline && (
          <p
            className={clsx(
              "text-2xl sm:text-3xl md:text-4xl font-semibold mb-6",
              "text-blue-600 dark:text-blue-400"
            )}
          >
            {subheadline}
          </p>
        )}

        {description && (
          <p
            className={clsx(
              typographyClasses.lead,
              "text-lg sm:text-xl mb-8 max-w-3xl mx-auto leading-loose",
              themeClasses.pageTextSecondary
            )}
          >
            {description}
          </p>
        )}

        {trustSignals && trustSignals.length > 0 && (
          <div className="flex flex-wrap justify-center gap-4 mb-8 text-sm sm:text-base">
            {trustSignals.map((signal, index) => (
              <div
                key={index}
                className={clsx(
                  "px-4 py-2 rounded-full",
                  "bg-blue-50 dark:bg-blue-950/30",
                  "border border-blue-200 dark:border-blue-800",
                  "text-blue-700 dark:text-blue-300"
                )}
              >
                {signal}
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
        </div>
      </div>
    </section>
  );
}



