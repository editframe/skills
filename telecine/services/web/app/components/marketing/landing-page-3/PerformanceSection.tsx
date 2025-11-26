import clsx from "clsx";
import type { PerformanceSectionProps } from "./types";

/**
 * Performance section showcasing speed and scale metrics
 */
export function PerformanceSection({
  headline,
  description,
  metrics,
}: PerformanceSectionProps) {
  return (
    <section className="py-12 sm:py-16">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <div className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              {headline}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              {description}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {metrics.map((metric, index) => (
              <div
                key={index}
                className={clsx(
                  "p-4 rounded-xl text-center",
                  "bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900",
                  "border border-slate-200 dark:border-slate-700"
                )}
              >
                <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                  {metric.value}
                </div>
                <div className="text-sm font-medium text-slate-900 dark:text-white mt-1">
                  {metric.label}
                </div>
                {metric.description && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {metric.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}



