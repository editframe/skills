import clsx from "clsx";
import type { ArchitectureSectionProps } from "./types";

/**
 * Architecture diagram section showing how Editframe connects different parts
 */
export function ArchitectureSection({
  headline,
  description,
  centerLabel,
  leftItems,
  rightItems,
}: ArchitectureSectionProps) {
  return (
    <section className="py-16 sm:py-20 border-t border-slate-200 dark:border-slate-800">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
            {headline}
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
            {description}
          </p>
        </div>

        {/* Architecture Diagram */}
        <div className="relative">
          <div className="grid grid-cols-3 gap-4 items-center">
            {/* Left Column - Inputs */}
            <div className="space-y-3">
              {leftItems.map((item, index) => (
                <div
                  key={index}
                  className={clsx(
                    "flex items-center gap-3 p-3 rounded-lg",
                    "bg-white dark:bg-slate-800",
                    "border border-slate-200 dark:border-slate-700",
                    "shadow-sm"
                  )}
                >
                  <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                    <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Center - Editframe Hub */}
            <div className="flex justify-center">
              <div
                className={clsx(
                  "relative w-40 h-40 rounded-2xl",
                  "bg-gradient-to-br from-blue-600 to-blue-700",
                  "shadow-xl shadow-blue-600/30",
                  "flex flex-col items-center justify-center text-white"
                )}
              >
                <svg className="w-10 h-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
                <span className="font-bold text-sm">{centerLabel}</span>
                
                {/* Connection Lines */}
                <div className="absolute left-0 top-1/2 -translate-x-full w-8 h-0.5 bg-blue-300 dark:bg-blue-500/50" />
                <div className="absolute right-0 top-1/2 translate-x-full w-8 h-0.5 bg-blue-300 dark:bg-blue-500/50" />
              </div>
            </div>

            {/* Right Column - Outputs */}
            <div className="space-y-3">
              {rightItems.map((item, index) => (
                <div
                  key={index}
                  className={clsx(
                    "flex items-center gap-3 p-3 rounded-lg",
                    "bg-white dark:bg-slate-800",
                    "border border-slate-200 dark:border-slate-700",
                    "shadow-sm"
                  )}
                >
                  <div className="w-8 h-8 rounded bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}








