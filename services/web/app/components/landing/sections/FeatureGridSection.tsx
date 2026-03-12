import clsx from "clsx";
import type { FeatureGridSectionProps } from "../types";

/**
 * Feature Grid Section - Grid of feature cards
 * For showcasing multiple features in a visually appealing grid
 */
export function FeatureGridSection({
  eyebrow,
  headline,
  description,
  features,
}: FeatureGridSectionProps) {
  // Gradient colors for each card
  const gradients = [
    "from-blue-500/10 to-violet-500/10 dark:from-blue-500/5 dark:to-violet-500/5",
    "from-emerald-500/10 to-cyan-500/10 dark:from-emerald-500/5 dark:to-cyan-500/5",
    "from-orange-500/10 to-rose-500/10 dark:from-orange-500/5 dark:to-rose-500/5",
    "from-violet-500/10 to-pink-500/10 dark:from-violet-500/5 dark:to-pink-500/5",
    "from-cyan-500/10 to-blue-500/10 dark:from-cyan-500/5 dark:to-blue-500/5",
    "from-rose-500/10 to-orange-500/10 dark:from-rose-500/5 dark:to-orange-500/5",
  ];

  const iconColors = [
    "text-blue-600 dark:text-blue-400",
    "text-emerald-600 dark:text-emerald-400",
    "text-orange-600 dark:text-orange-400",
    "text-violet-600 dark:text-violet-400",
    "text-cyan-600 dark:text-cyan-400",
    "text-rose-600 dark:text-rose-400",
  ];

  return (
    <section className="relative py-20 sm:py-28 lg:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          {eyebrow && (
            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 mb-4">
              {eyebrow}
            </div>
          )}
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-6 leading-tight">
            {headline}
          </h2>
          {description && (
            <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300">
              {description}
            </p>
          )}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, i) => (
            <div
              key={i}
              className={clsx(
                "group relative p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br hover:scale-[1.02] transition-all duration-300 hover:shadow-xl dark:hover:shadow-slate-900/50",
                gradients[i % gradients.length],
              )}
            >
              {/* Icon */}
              {feature.icon ? (
                <div
                  className={clsx(
                    "inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white dark:bg-slate-800 shadow-sm mb-5",
                    iconColors[i % iconColors.length],
                  )}
                >
                  {feature.icon}
                </div>
              ) : (
                <div
                  className={clsx(
                    "inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white dark:bg-slate-800 shadow-sm mb-5",
                    iconColors[i % iconColors.length],
                  )}
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              )}

              {/* Title */}
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                {feature.title}
              </h3>

              {/* Description */}
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
