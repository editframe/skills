import clsx from "clsx";
import type { TechStackSectionProps } from "./types";
import { CodeBlock } from "~/components/CodeBlock";

/**
 * Tech stack section showing technologies and TypeScript example
 */
export function TechStackSection({
  headline,
  description,
  technologies,
  codeExample,
}: TechStackSectionProps) {
  return (
    <section className="py-12 sm:py-16">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          <div className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                {headline}
              </h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                {description}
              </p>
            </div>

            <div className="space-y-3">
              {technologies.map((tech, index) => (
                <div
                  key={index}
                  className={clsx(
                    "flex items-start gap-3 p-3 rounded-lg",
                    "bg-slate-50 dark:bg-slate-800/50",
                    "border border-slate-200 dark:border-slate-700"
                  )}
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">
                      {tech.name}
                    </div>
                    {tech.description && (
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        {tech.description}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {codeExample && (
            <div className="rounded-xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-700">
              <CodeBlock>
                <code className="language-typescript">{codeExample}</code>
              </CodeBlock>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

