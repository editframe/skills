import clsx from "clsx";
import type { TrustedBySectionProps } from "../types";

/**
 * Trusted By Section - Logo bar of companies/users
 */
export function TrustedBySection({ logos }: TrustedBySectionProps) {
  return (
    <section className="relative py-16 sm:py-20 border-y border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-10">
          Trusted by
        </p>
        
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8">
          {logos.map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity grayscale hover:grayscale-0"
            >
              {item.logo ? (
                item.logo
              ) : (
                /* Placeholder logo */
                <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                  <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700" />
                  <span className="font-semibold text-lg">{item.name}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}








