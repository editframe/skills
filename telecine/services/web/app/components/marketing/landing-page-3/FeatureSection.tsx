import { Link } from "react-router";
import clsx from "clsx";
import type { FeatureSectionProps } from "./types";
import { CodeBlock } from "~/components/CodeBlock";

/**
 * Feature section with alternating layouts
 * Shows headline, description, and optional code example
 */
export function FeatureSection({
  headline,
  description,
  codeExample,
  codeLanguage = "typescript",
  learnMoreHref,
  layout = "left",
  badges = [],
}: FeatureSectionProps) {
  const content = (
    <div className="space-y-4">
      <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
        {headline}
      </h2>
      <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
        {description}
      </p>
      {badges.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {badges.map((badge, index) => (
            <span
              key={index}
              className="px-3 py-1 rounded-full text-xs font-medium bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300"
            >
              {badge}
            </span>
          ))}
        </div>
      )}
      {learnMoreHref && (
        <Link
          to={learnMoreHref}
          className="inline-flex items-center gap-1.5 text-violet-600 dark:text-violet-400 font-medium hover:underline"
        >
          More
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </Link>
      )}
    </div>
  );

  const code = codeExample && (
    <div className="rounded-xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-700">
      <CodeBlock>
        <code className={`language-${codeLanguage}`}>{codeExample}</code>
      </CodeBlock>
    </div>
  );

  return (
    <section className="py-12 sm:py-16">
      <div className="max-w-6xl mx-auto">
        <div
          className={clsx(
            "grid gap-8 lg:gap-12 items-center",
            codeExample ? "lg:grid-cols-2" : "lg:grid-cols-1 max-w-3xl"
          )}
        >
          {layout === "left" ? (
            <>
              {content}
              {code}
            </>
          ) : (
            <>
              <div className="order-2 lg:order-1">{code}</div>
              <div className="order-1 lg:order-2">{content}</div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

