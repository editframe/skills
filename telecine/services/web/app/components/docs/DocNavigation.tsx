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
    <div className={clsx("space-y-6", className)}>
      <div>
        <h2 className="text-2xl font-bold mb-3">{title}</h2>
        {introText && <p className="text-slate-600 dark:text-slate-400 mb-6">{introText}</p>}
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">
          Available {title === "Reference" ? "Documentation" : "Items"}
        </h3>
        <ul className="space-y-2">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                to={link.href}
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                {link.title}
              </Link>
              {link.description && (
                <span className="text-slate-600 dark:text-slate-400 ml-2">
                  - {link.description}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {relatedSections && relatedSections.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Related Documentation</h3>
          <ul className="space-y-2">
            {relatedSections.map((section) => (
              <li key={section.href}>
                <Link
                  to={section.href}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
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
      {title && <h3 className="text-lg font-semibold">{title}</h3>}
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              to={link.href}
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              {link.title}
            </Link>
            {link.description && (
              <span className="text-slate-600 dark:text-slate-400 ml-2">
                - {link.description}
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
      <h2 className="text-2xl font-bold">{title}</h2>
      {children}
    </div>
  );
};

