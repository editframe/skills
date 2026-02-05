import type { FC, ReactNode } from "react";
import { Link } from "react-router";
import clsx from "clsx";

interface DocLink {
  title: string;
  href: string;
  description?: string;
}

interface DocSectionIndexProps {
  title: string;
  introText?: string;
  links: DocLink[];
  relatedSections?: Array<{ name: string; href: string }>;
  className?: string;
}

export const DocSectionIndex: FC<DocSectionIndexProps> = ({
  title,
  introText,
  links,
  relatedSections,
  className,
}) => {
  return (
    <div className={clsx("space-y-8", className)}>
      <div>
        <h2 className="text-2xl font-bold text-[var(--ink-black)] dark:text-white mb-3">{title}</h2>
        {introText && (
          <p className="text-[var(--warm-gray)] mb-6">{introText}</p>
        )}
      </div>

      <div>
        <h3 className="text-xs font-bold text-[var(--ink-black)] dark:text-white uppercase tracking-wider mb-4">
          Available {title === "Reference" ? "Documentation" : "Items"}
        </h3>
        <ul className="space-y-2 border-l-2 border-[var(--ink-black)]/10 dark:border-white/10 pl-4">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                to={link.href}
                className="text-[var(--accent-blue)] hover:text-[var(--accent-red)] font-semibold transition-colors"
              >
                {link.title}
              </Link>
              {link.description && (
                <span className="text-[var(--warm-gray)] ml-2">
                  — {link.description}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {relatedSections && relatedSections.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-[var(--ink-black)] dark:text-white uppercase tracking-wider mb-4">Related Documentation</h3>
          <ul className="space-y-2 border-l-2 border-[var(--accent-gold)]/30 pl-4">
            {relatedSections.map((section) => (
              <li key={section.href}>
                <Link
                  to={section.href}
                  className="text-[var(--accent-blue)] hover:text-[var(--accent-red)] transition-colors"
                >
                  {section.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

interface DocLinkListProps {
  links: DocLink[];
  title?: string;
  className?: string;
}

export const DocLinkList: FC<DocLinkListProps> = ({
  links,
  title,
  className,
}) => {
  return (
    <div className={clsx("space-y-3", className)}>
      {title && <h3 className="text-sm font-bold text-[var(--ink-black)] dark:text-white uppercase tracking-wider">{title}</h3>}
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              to={link.href}
              className="text-[var(--accent-blue)] hover:text-[var(--accent-red)] font-medium transition-colors"
            >
              {link.title}
            </Link>
            {link.description && (
              <span className="text-[var(--warm-gray)] ml-2">
                — {link.description}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

interface DocNavSectionProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export const DocNavSection: FC<DocNavSectionProps> = ({
  title,
  children,
  className,
}) => {
  return (
    <div className={clsx("space-y-4", className)}>
      <h2 className="text-2xl font-bold text-[var(--ink-black)] dark:text-white">{title}</h2>
      {children}
    </div>
  );
};
