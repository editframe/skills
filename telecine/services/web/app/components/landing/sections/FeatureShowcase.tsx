import { Link } from "react-router";
import clsx from "clsx";
import type { FeatureShowcaseProps } from "../types";
import { CodeBlock } from "~/components/CodeBlock";

/**
 * Feature Showcase - Side-by-side code + visual demonstration
 * Inspired by Remotion's "Compose with code", "Edit dynamically" sections
 */
export function FeatureShowcase({
  eyebrow,
  headline,
  description,
  codeExample,
  codeLanguage = "typescript",
  visualComponent,
  links,
  reversed = false,
}: FeatureShowcaseProps) {
  return (
    <section className="relative py-20 sm:py-28 lg:py-32 overflow-hidden">
      {/* Background accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-50/50 to-transparent dark:via-slate-900/50" />
      
      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
        <div className={clsx(
          "grid lg:grid-cols-2 gap-12 lg:gap-16 items-center",
          reversed && "lg:grid-flow-dense"
        )}>
          {/* Content side */}
          <div className={clsx(reversed && "lg:col-start-2")}>
            {/* Eyebrow */}
            {eyebrow && (
              <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 mb-4">
                {eyebrow}
              </div>
            )}

            {/* Headline with gradient accent */}
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-6 leading-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600 dark:from-blue-400 dark:to-violet-400">
                {headline.split(' ')[0]}
              </span>{' '}
              {headline.split(' ').slice(1).join(' ')}
            </h2>

            {/* Description */}
            <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
              {description}
            </p>

            {/* Links */}
            {links && links.length > 0 && (
              <div className="flex flex-wrap gap-4">
                {links.map((link, i) => (
                  <Link
                    key={i}
                    to={link.href}
                    className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium group"
                  >
                    {link.label}
                    <svg className="ml-1 w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Visual side */}
          <div className={clsx(reversed && "lg:col-start-1 lg:row-start-1")}>
            <div className="relative group">
              {/* Glow effect */}
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-600/20 to-violet-600/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              {/* Code block or visual placeholder */}
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl dark:shadow-slate-900/50">
                {visualComponent ? (
                  <div className="bg-slate-50 dark:bg-slate-900">
                    {visualComponent}
                  </div>
                ) : codeExample ? (
                  <div className="bg-slate-50 dark:bg-slate-900">
                    {/* Editor header */}
                    <div className="flex items-center gap-2 px-4 py-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-400" />
                        <div className="w-3 h-3 rounded-full bg-yellow-400" />
                        <div className="w-3 h-3 rounded-full bg-green-400" />
                      </div>
                      <span className="ml-3 text-xs text-slate-500 dark:text-slate-400 font-mono">composition.tsx</span>
                    </div>
                    {/* Code content */}
                    <div className="p-4 overflow-x-auto">
                      <CodeBlock className="!bg-transparent !p-0">
                        <code className={`language-${codeLanguage}`}>{codeExample}</code>
                      </CodeBlock>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-video bg-gradient-to-br from-blue-50 to-violet-50 dark:from-blue-950/30 dark:to-violet-950/30" />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}








