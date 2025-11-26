import type { FC } from "react";
import { Link } from "react-router";
import clsx from "clsx";

export interface ElementIndexData {
  elementName: string;
  elementDescription: string;
  tutorial: {
    title: string;
    href: string;
    description?: string;
  } | null;
  howToGuides: Array<{
    title: string;
    href: string;
    description?: string;
  }>;
  explanations: Array<{
    title: string;
    href: string;
    description?: string;
  }>;
  reference: {
    title: string;
    href: string;
    description?: string;
  } | null;
}

export interface ElementIndexProps {
  /**
   * Element directory path relative to docs base (e.g., "010-elements/008-audio")
   * Can also be full path
   */
  directory?: string;
  /**
   * Base slug for generating links (e.g., "/docs/elements/audio")
   */
  baseSlug?: string;
  /**
   * Pre-computed element index data (used when data is computed in loader)
   * If provided, directory and baseSlug are ignored
   */
  data?: ElementIndexData;
}

/**
 * ElementIndex component that automatically generates element landing page content.
 * 
 * This component scans the element directory structure to generate:
 * - Element name and description from index.mdx frontmatter
 * - Get Started section with links to tutorial, how-to, explanation, and reference
 * - Common Tasks section from how-to guides
 * - Key Concepts section from explanations
 * 
 * @example
 * ```mdx
 * <ElementIndex />
 * ```
 * 
 * The component will automatically detect the directory and base slug from context,
 * or you can provide them explicitly:
 * 
 * ```mdx
 * <ElementIndex directory="010-elements/008-audio" baseSlug="/docs/elements/audio" />
 * ```
 */
export const ElementIndex: FC<ElementIndexProps> = ({
  directory,
  baseSlug,
  data,
}) => {
  // If data is provided, use it directly
  if (data) {
    // Derive base slug from any available href
    const baseSlug = data.tutorial?.href.replace("/tutorial", "") ||
                     data.reference?.href.replace("/reference", "") ||
                     (data.howToGuides.length > 0 ? data.howToGuides[0].href.replace(/\/how-to\/.*$/, "") : "") ||
                     (data.explanations.length > 0 ? data.explanations[0].href.replace(/\/explanation\/.*$/, "") : "") ||
                     "/docs";

    return (
      <div className="space-y-8">
        {/* Element Name and Description */}
        <div>
          <h1 className="text-3xl font-bold mb-4">{data.elementName}</h1>
          {data.elementDescription && (
            <p className="text-lg text-slate-600 dark:text-slate-400">
              {data.elementDescription}
            </p>
          )}
        </div>

        {/* Get Started Section */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Get Started</h2>
          <div className="space-y-2 text-slate-700 dark:text-slate-300">
            {data.tutorial && (
              <p>
                <strong>New to {data.elementName.toLowerCase()} elements?</strong> Start with the{" "}
                <Link
                  to={data.tutorial.href}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  Tutorial
                </Link>{" "}
                to learn step-by-step.
              </p>
            )}
            {data.howToGuides.length > 0 && (
              <p>
                <strong>Need to accomplish a specific task?</strong> Jump to{" "}
                <Link
                  to={`${baseSlug}/how-to`}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  How-To Guides
                </Link>
                .
              </p>
            )}
            {data.explanations.length > 0 && (
              <p>
                <strong>Want to understand how it works?</strong> Explore{" "}
                <Link
                  to={`${baseSlug}/explanation`}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  Explanations
                </Link>
                .
              </p>
            )}
            {data.reference && (
              <p>
                <strong>Looking up properties?</strong> See the{" "}
                <Link
                  to={data.reference.href}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  Reference
                </Link>
                .
              </p>
            )}
          </div>
        </div>

        {/* Common Tasks Section */}
        {data.howToGuides.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Common Tasks</h2>
            <ul className="space-y-2">
              {data.howToGuides.map((guide) => (
                <li key={guide.href}>
                  <Link
                    to={guide.href}
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    {guide.title}
                  </Link>
                  {guide.description && (
                    <span className="text-slate-600 dark:text-slate-400 ml-2">
                      - {guide.description}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Key Concepts Section */}
        {data.explanations.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Key Concepts</h2>
            <ul className="space-y-2">
              {data.explanations.map((concept) => (
                <li key={concept.href}>
                  <Link
                    to={concept.href}
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    {concept.title}
                  </Link>
                  {concept.description && (
                    <span className="text-slate-600 dark:text-slate-400 ml-2">
                      - {concept.description}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  // If directory/baseSlug are provided but no data, show error
  if (directory && baseSlug) {
    return (
      <div className="p-4 border border-yellow-300 bg-yellow-50 rounded">
        <p className="text-sm text-yellow-800">
          ElementIndex: Data not pre-computed. Directory: {directory}, BaseSlug: {baseSlug}
        </p>
        <p className="text-xs text-yellow-700 mt-2">
          The loader should pre-compute index data when ElementIndex is used.
        </p>
      </div>
    );
  }

  // No props provided - show error
  return (
    <div className="p-4 border border-red-300 bg-red-50 rounded">
      <p className="text-sm text-red-800">
        ElementIndex: Missing required props. Provide either `data` or both `directory` and `baseSlug`.
      </p>
    </div>
  );
};

