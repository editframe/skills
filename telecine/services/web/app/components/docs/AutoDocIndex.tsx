import type { FC } from "react";
import { DocSectionIndex } from "./DocNavigation";

export interface AutoDocIndexProps {
  /**
   * Directory path relative to docs base (e.g., "how-to" or "020-how-to")
   * Can also be full path like "010-elements/008-audio/020-how-to"
   */
  directory?: string;
  /**
   * Base slug for generating links (e.g., "/docs/elements/audio")
   * If not provided, will attempt to derive from current route
   */
  baseSlug?: string;
  /**
   * Pre-computed index data (used when data is computed in loader)
   * If provided, directory and baseSlug are ignored
   */
  data?: {
    title: string;
    sectionTitle: string;
    introText: string;
    links: Array<{
      title: string;
      href: string;
      description?: string;
    }>;
    relatedSections: Array<{
      name: string;
      href: string;
    }>;
  };
}

/**
 * AutoDocIndex component that automatically scans a directory and generates an index page.
 * 
 * This component can be used in two ways:
 * 1. With pre-computed data (preferred): Pass `data` prop with pre-computed index data
 * 2. With directory scanning: Pass `directory` and `baseSlug` props (requires server-side computation)
 * 
 * @example
 * ```mdx
 * <AutoDocIndex directory="how-to" baseSlug="/docs/elements/audio" />
 * ```
 * 
 * @example With pre-computed data
 * ```mdx
 * <AutoDocIndex data={indexData} />
 * ```
 */
export const AutoDocIndex: FC<AutoDocIndexProps> = ({ directory, baseSlug, data }) => {
  // If data is provided, use it directly
  if (data) {
    return (
      <DocSectionIndex
        title={data.sectionTitle}
        introText={data.introText}
        links={data.links}
        relatedSections={data.relatedSections}
      />
    );
  }

  // If directory/baseSlug are provided but no data, this means the data
  // should have been computed server-side. In this case, we'll show an error
  // or fallback message. In practice, the loader should pre-compute the data.
  if (directory && baseSlug) {
    // This shouldn't happen in production - data should be pre-computed
    // But we provide a fallback for development/debugging
    return (
      <div className="p-4 border border-yellow-300 bg-yellow-50 rounded">
        <p className="text-sm text-yellow-800">
          AutoDocIndex: Data not pre-computed. Directory: {directory}, BaseSlug: {baseSlug}
        </p>
        <p className="text-xs text-yellow-700 mt-2">
          The loader should pre-compute index data when AutoDocIndex is used.
        </p>
      </div>
    );
  }

  // No props provided - show error
  return (
    <div className="p-4 border border-red-300 bg-red-50 rounded">
      <p className="text-sm text-red-800">
        AutoDocIndex: Missing required props. Provide either `data` or both `directory` and `baseSlug`.
      </p>
    </div>
  );
};










