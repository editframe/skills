import type { FC } from "react";

interface Heading {
  value: string;
  slug: string;
}

export const TableOfContents: FC<{
  headings?: Heading[];
}> = ({ headings }) => {
  if (!headings) return <></>;

  return (
    <div className="border-l-2 border-[var(--ink-black)]/10 dark:border-white/10 pl-4">
      <h2 className="text-xs font-bold text-[var(--ink-black)] dark:text-white uppercase tracking-wider mb-3">
        On this page
      </h2>
      <ul className="space-y-1">
        {headings.map(({ value, slug }) =>
          slug && value ? (
            <li key={slug}>
              <a 
                className="block text-sm text-[var(--warm-gray)] hover:text-[var(--accent-blue)] transition-colors py-1" 
                href={`#${slug}`}
              >
                {value}
              </a>
            </li>
          ) : (
            <></>
          ),
        )}
      </ul>
    </div>
  );
};
