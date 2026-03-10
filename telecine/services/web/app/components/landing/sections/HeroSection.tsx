import { Link } from "react-router";
import clsx from "clsx";
import type { HeroSectionProps } from "../types";

/**
 * Hero Section - Bold typography with code terminal
 * Inspired by Remotion's impactful hero with immediate developer action
 */
export function HeroSection({
  headline,
  highlightedWord,
  description,
  installCommand,
  primaryCTA,
  secondaryCTA,
  quickLinks,
}: HeroSectionProps) {
  // Split headline to highlight specific word
  const headlineParts = highlightedWord
    ? headline.split(highlightedWord)
    : [headline];

  return (
    <section className="relative min-h-[85vh] flex flex-col justify-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50 to-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />

      {/* Decorative grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:64px_64px] dark:bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)]" />

      {/* Floating accent blob */}
      <div className="absolute top-20 right-[10%] w-[500px] h-[500px] bg-blue-500/10 dark:bg-blue-400/5 rounded-full blur-[100px] animate-float-slow pointer-events-none" />
      <div
        className="absolute bottom-20 left-[5%] w-[400px] h-[400px] bg-violet-500/10 dark:bg-violet-400/5 rounded-full blur-[100px] animate-float-slow pointer-events-none"
        style={{ animationDelay: "2s" }}
      />

      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
        <div className="max-w-5xl mx-auto text-center">
          {/* Main headline - MASSIVE typography */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight text-slate-900 dark:text-white mb-6 leading-[1.1]">
            {headlineParts[0]}
            {highlightedWord && (
              <>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600 dark:from-blue-400 dark:to-violet-400">
                  {highlightedWord}
                </span>
                {headlineParts[1]}
              </>
            )}
          </h1>

          {/* Description */}
          <p className="text-lg sm:text-xl md:text-2xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto mb-10 leading-relaxed">
            {description}
          </p>

          {/* Install command terminal */}
          {installCommand && (
            <div className="max-w-xl mx-auto mb-10">
              <div className="group relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-violet-600 rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-500" />
                <div className="relative flex items-center bg-slate-900 dark:bg-slate-950 rounded-xl border border-slate-800 px-4 py-3 font-mono text-sm sm:text-base">
                  <span className="text-slate-500 mr-3 select-none">$</span>
                  <code className="text-slate-100 flex-1 overflow-x-auto">
                    {installCommand}
                  </code>
                  <button
                    onClick={() =>
                      navigator.clipboard.writeText(installCommand)
                    }
                    className="ml-3 p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800"
                    title="Copy to clipboard"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link
              to={primaryCTA.href}
              className="inline-flex items-center px-8 py-4 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-lg hover:bg-slate-800 dark:hover:bg-slate-100 transition-all hover:scale-105 shadow-lg hover:shadow-xl"
            >
              {primaryCTA.label}
              <svg
                className="ml-2 w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Link>
            {secondaryCTA && (
              <Link
                to={secondaryCTA.href}
                className="inline-flex items-center px-8 py-4 rounded-full border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-lg hover:border-slate-300 dark:hover:border-slate-600 transition-all hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                {secondaryCTA.label}
              </Link>
            )}
          </div>

          {/* Quick links row */}
          {quickLinks && quickLinks.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm">
              {quickLinks.map((link, i) => (
                <Link
                  key={i}
                  to={link.href}
                  className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1.5 group"
                >
                  <span>{link.label}</span>
                  <svg
                    className="w-4 h-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
