import type { FC } from "react";
import { AutoDocIndex, type AutoDocIndexProps } from "./AutoDocIndex";

export interface HowToIndexProps {
  /**
   * Directory path relative to docs base (e.g., "how-to" or "020-how-to")
   * Defaults to "how-to" if not provided
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
 * Convenience wrapper for AutoDocIndex pre-configured for How-To sections.
 * 
 * @example
 * ```mdx
 * <HowToIndex />
 * ```
 * 
 * The component will automatically detect the directory and base slug from context,
 * or you can provide them explicitly:
 * 
 * ```mdx
 * <HowToIndex directory="how-to" baseSlug="/docs/elements/audio" />
 * ```
 */
export const HowToIndex: FC<HowToIndexProps> = ({
  directory = "how-to",
  baseSlug,
  data,
}) => {
  return <AutoDocIndex directory={directory} baseSlug={baseSlug} data={data} />;
};





