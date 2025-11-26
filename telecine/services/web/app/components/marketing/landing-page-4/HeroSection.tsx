import { Link } from "react-router";
import clsx from "clsx";
import type { HeroSectionProps } from "./types";

/**
 * Hero section - Enterprise-focused with logo cloud
 */
export function HeroSection({
  headline,
  subheadline,
  primaryCTA,
  secondaryCTA,
  logos,
}: HeroSectionProps) {
  return (
    <section className="py-16 sm:py-20 lg:py-24">
      <div className="max-w-4xl mx-auto text-center">
        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white leading-tight tracking-tight">
          {headline}
        </h1>

        {/* Subheadline */}
        <p className="mt-6 text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          {subheadline}
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to={primaryCTA.href}
            className={clsx(
              "px-8 py-3.5 rounded-lg font-semibold text-base",
              "bg-blue-600 hover:bg-blue-700 text-white",
              "shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/30",
              "transition-all duration-200"
            )}
          >
            {primaryCTA.label}
          </Link>
          <Link
            to={secondaryCTA.href}
            className={clsx(
              "px-8 py-3.5 rounded-lg font-semibold text-base",
              "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200",
              "border border-slate-300 dark:border-slate-600",
              "hover:border-slate-400 dark:hover:border-slate-500",
              "transition-all duration-200"
            )}
          >
            {secondaryCTA.label}
          </Link>
        </div>

        {/* Logo Cloud */}
        <div className="mt-16">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 uppercase tracking-wider font-medium">
            Trusted by innovative teams
          </p>
          <div className="flex flex-wrap justify-center items-center gap-x-10 gap-y-6">
            {logos.map((logo, index) => (
              <div
                key={index}
                className="text-slate-400 dark:text-slate-500 font-semibold text-lg opacity-70 hover:opacity-100 transition-opacity"
              >
                {logo.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}



