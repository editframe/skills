import { Link } from "react-router";
import clsx from "clsx";
import type { HeroSectionProps } from "./types";

/**
 * Hero section - Clean, minimal design with install command
 * Inspired by Mediabunny's developer-focused hero
 */
export function HeroSection({
  headline,
  subheadline,
  installCommand,
  primaryCTA,
  secondaryCTAs = [],
  badges = [],
}: HeroSectionProps) {
  return (
    <section className="relative py-16 sm:py-24 lg:py-32">
      <div className="max-w-4xl mx-auto text-center">
        {/* Logo/Brand mark */}
        <div className="mb-8 flex justify-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          </div>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">
          <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
            Editframe
          </span>
          <br />
          {headline}
        </h1>

        {/* Subheadline */}
        <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto leading-relaxed">
          {subheadline}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
          <Link
            to={primaryCTA.href}
            className={clsx(
              "px-6 py-2.5 rounded-lg font-medium text-sm",
              "bg-slate-900 dark:bg-white text-white dark:text-slate-900",
              "hover:bg-slate-800 dark:hover:bg-slate-100",
              "shadow-sm transition-all"
            )}
          >
            {primaryCTA.label}
          </Link>
          {secondaryCTAs.map((cta, index) => (
            <Link
              key={index}
              to={cta.href}
              className={clsx(
                "px-6 py-2.5 rounded-lg font-medium text-sm",
                "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
                "hover:bg-slate-200 dark:hover:bg-slate-700",
                "transition-all"
              )}
            >
              {cta.label}
            </Link>
          ))}
        </div>

        {/* Install Command */}
        <div className="inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-slate-900 dark:bg-slate-800 text-slate-100 font-mono text-sm shadow-lg">
          <span className="text-slate-500">$</span>
          <code>{installCommand}</code>
          <button
            className="text-slate-500 hover:text-white transition-colors"
            onClick={() => navigator.clipboard.writeText(installCommand.replace(/^npm install /, ""))}
            aria-label="Copy to clipboard"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>

        {/* Badges */}
        {badges.length > 0 && (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm text-slate-500 dark:text-slate-400">
            {badges.map((badge, index) => (
              <span key={index} className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {badge}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}








