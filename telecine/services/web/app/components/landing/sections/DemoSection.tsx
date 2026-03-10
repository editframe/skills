import clsx from "clsx";
import type { DemoSectionProps } from "../types";

/**
 * Demo Section - Interactive preview placeholder
 */
export function DemoSection({ headline, description }: DemoSectionProps) {
  return (
    <section className="relative py-20 sm:py-28 lg:py-32 bg-slate-50 dark:bg-slate-900/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-4">
            {headline}
          </h2>
          {description && (
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              {description}
            </p>
          )}
        </div>

        {/* Demo container */}
        <div className="max-w-5xl mx-auto">
          <div className="relative group">
            {/* Glow effect */}
            <div className="absolute -inset-2 bg-gradient-to-r from-blue-600/30 via-violet-600/30 to-blue-600/30 rounded-3xl blur-2xl opacity-50 group-hover:opacity-75 transition-opacity duration-500" />

            <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl">
              {/* Browser chrome */}
              <div className="flex items-center gap-4 px-4 py-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-xs text-slate-500 dark:text-slate-400 font-mono">
                    localhost:3000/preview
                  </div>
                </div>
              </div>

              {/* Demo area - placeholder for interactive demo */}
              <div className="aspect-video bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-center p-8">
                  {/* Video player placeholder */}
                  <div className="relative mb-8">
                    <div className="w-full max-w-lg mx-auto aspect-video rounded-xl bg-black/50 border border-slate-700 overflow-hidden">
                      {/* Video preview placeholder */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-20 h-20 rounded-full bg-blue-600/20 flex items-center justify-center backdrop-blur-sm border border-blue-500/30 hover:bg-blue-600/30 transition-colors cursor-pointer">
                          <svg
                            className="w-10 h-10 text-blue-400 ml-1"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>

                      {/* Fake timeline */}
                      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80">
                        <div className="h-1 rounded-full bg-slate-600 overflow-hidden">
                          <div className="h-full w-1/3 bg-blue-500 rounded-full" />
                        </div>
                        <div className="flex items-center justify-between mt-2 text-xs text-slate-400 font-mono">
                          <span>0:12</span>
                          <span>0:30</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-slate-400 text-sm">
                    {/* PLACEHOLDER: Interactive demo will be embedded here */}
                    Interactive demo — preview your compositions in real-time
                  </p>

                  {/* Control hints */}
                  <div className="flex items-center justify-center gap-4 mt-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <kbd className="px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                        Space
                      </kbd>
                      Play/Pause
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                        ←→
                      </kbd>
                      Scrub
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
