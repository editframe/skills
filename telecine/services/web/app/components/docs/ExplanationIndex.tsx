import type { FC } from "react";
import { AutoDocIndex, type AutoDocIndexProps } from "./AutoDocIndex";

export interface ExplanationIndexProps {
  /**
   * Directory path relative to docs base (e.g., "explanation" or "030-explanation")
   * Defaults to "explanation" if not provided
   */
  directory?: string;
  /**
   * Base slug for generating links (e.g., "/docs/elements/audio")
   */
  baseSlug?: string;
  /**
   * Pre-computed index data (used when data is computed in loader)
   */
  data?: AutoDocIndexProps["data"];
}

/**
 * Convenience wrapper for AutoDocIndex pre-configured for Explanation sections.
 * 
 * @example
 * ```mdx
 * <ExplanationIndex />
 * ```
 * 
 * The component will automatically detect the directory and base slug from context,
 * or you can provide them explicitly:
 * 
 * ```mdx
 * <ExplanationIndex directory="explanation" baseSlug="/docs/elements/audio" />
 * ```
 */
export const ExplanationIndex: FC<ExplanationIndexProps> = ({
  directory = "explanation",
  baseSlug,
  data,
}) => {
  return <AutoDocIndex directory={directory} baseSlug={baseSlug} data={data} />;
};










