import { join, resolve } from "node:path";
import { existsSync, readFileSync, statSync } from "node:fs";
import {
  getDocIndexData,
  deriveBaseSlugFromPath,
} from "./doc-index-data.server";
import { getElementIndexData } from "./element-index-data.server";

const appDir = resolve(process.cwd(), "services/web/app");
const docsBasePath = join(appDir, "content", "docs");

/**
 * Processes MDX content to inject pre-computed data into AutoDocIndex components.
 *
 * This function:
 * 1. Detects AutoDocIndex, HowToIndex, ExplanationIndex, or ElementIndex component usage
 * 2. Computes the index data based on the file path
 * 3. Injects the data as props into the component
 *
 * @param mdxContent - The MDX content to process
 * @param filePath - The path to the MDX file (relative to docs base, e.g., "010-elements/008-audio/020-how-to/index.mdx")
 * @returns Processed MDX content with injected data
 */
export async function processDocIndexComponents(
  mdxContent: string,
  filePath: string,
): Promise<string> {
  // Check if the content uses any of the index components
  const hasAutoDocIndex = /<AutoDocIndex/i.test(mdxContent);
  const hasHowToIndex = /<HowToIndex/i.test(mdxContent);
  const hasExplanationIndex = /<ExplanationIndex/i.test(mdxContent);
  const hasElementIndex = /<ElementIndex/i.test(mdxContent);

  if (
    !hasAutoDocIndex &&
    !hasHowToIndex &&
    !hasExplanationIndex &&
    !hasElementIndex
  ) {
    // No index components found, return content as-is
    return mdxContent;
  }

  // Determine the directory and base slug from the file path
  // Example: "010-elements/008-audio/020-how-to/index.mdx" -> directory: "020-how-to", baseSlug: "/docs/elements/audio"
  // Example: "010-elements/008-audio/index.mdx" -> element directory: "010-elements/008-audio", baseSlug: "/docs/elements/audio"
  // filePath might include "docs/" prefix (from getContent), so strip it if present
  // Also handle both "index.mdx" and "index" formats
  let normalizedPath = filePath;

  // Strip "docs/" prefix if present (handle multiple occurrences just in case)
  normalizedPath = normalizedPath.replace(/^docs\//, "").replace(/^docs\//, "");

  // Remove "/index.mdx" or "/index" suffix, or trailing "/index/index.mdx" pattern
  normalizedPath = normalizedPath
    .replace(/\/index\/index\.mdx$/, "")
    .replace(/\/index\.mdx$/, "")
    .replace(/\/index$/, "");

  // If the path still ends with .mdx but isn't index, it's a regular file - get its directory
  if (normalizedPath.endsWith(".mdx") && !normalizedPath.includes("/index")) {
    normalizedPath = normalizedPath.replace(/\/[^/]+\.mdx$/, "");
  }

  const pathWithoutIndex = normalizedPath;
  const pathParts = pathWithoutIndex.split("/");

  // Handle ElementIndex differently - it's for element landing pages
  if (hasElementIndex) {
    // For element index, the pathWithoutIndex IS the element directory
    // Example: "010-elements/008-audio" -> element directory
    const elementDirectoryPath = join(docsBasePath, pathWithoutIndex);
    const baseSlug = deriveBaseSlugFromPath(pathWithoutIndex);

    // Debug logging
    if (process.env.NODE_ENV !== "production") {
      console.log("[processDocIndexComponents] ElementIndex path processing:", {
        originalFilePath: filePath,
        normalizedPath,
        pathWithoutIndex,
        elementDirectoryPath,
        baseSlug,
      });
    }

    // Compute element index data
    const elementIndexData = await getElementIndexData(
      elementDirectoryPath,
      baseSlug,
    );

    if (!elementIndexData) {
      console.warn(
        `[processDocIndexComponents] Could not compute element index data for:`,
        {
          filePath,
          elementDirectoryPath,
          baseSlug,
        },
      );
      return mdxContent;
    }

    // Replace ElementIndex component usage with data-injected version
    let processedContent = mdxContent;
    processedContent = processedContent.replace(
      /<ElementIndex([^>]*?)\/>/g,
      (match, props) => {
        if (props && /data\s*=/i.test(props)) {
          return match;
        }
        const trimmedProps = props.trim();
        const propsWithSpace = trimmedProps ? `${trimmedProps} ` : "";
        return `<ElementIndex ${propsWithSpace}data={${JSON.stringify(elementIndexData)}} />`;
      },
    );

    return processedContent;
  }

  // Handle section index components (HowToIndex, ExplanationIndex, AutoDocIndex)
  const directory = pathParts[pathParts.length - 1]; // Last part is the directory (e.g., "020-how-to")
  const parentPath = pathParts.slice(0, -1).join("/"); // Everything except the last part
  const baseSlug = deriveBaseSlugFromPath(parentPath);

  // Get the full directory path (pathWithoutIndex is relative to docs base, without "docs/" prefix)
  // docsBasePath already includes "docs", so we just join with the relative path
  const fullDirectoryPath = join(docsBasePath, pathWithoutIndex);

  // Debug logging (remove in production if needed)
  if (process.env.NODE_ENV !== "production") {
    console.log("[processDocIndexComponents] Path processing:", {
      originalFilePath: filePath,
      normalizedPath,
      pathWithoutIndex,
      docsBasePath,
      fullDirectoryPath,
      directory,
      parentPath,
      baseSlug,
    });
  }

  // Compute the index data - pass the full directory path
  const indexData = await getDocIndexData(fullDirectoryPath, baseSlug);

  if (!indexData) {
    // Couldn't compute data - log for debugging and return content as-is
    // Component will show error message to user
    console.warn(
      `[processDocIndexComponents] Could not compute index data for:`,
      {
        filePath,
        fullDirectoryPath,
        baseSlug,
        directory,
        pathWithoutIndex,
      },
    );
    return mdxContent;
  }

  // Replace component usages with data-injected versions
  // JSON.stringify produces valid JavaScript object literal for JSX props
  let processedContent = mdxContent;

  // Handle HowToIndex
  // Match <HowToIndex /> or <HowToIndex ...props />
  // The regex captures any props between the tag name and the closing />
  if (hasHowToIndex) {
    processedContent = processedContent.replace(
      /<HowToIndex([^>]*?)\/>/g,
      (match, props) => {
        // If props already has data, don't override
        if (props && /data\s*=/i.test(props)) {
          return match;
        }
        // Inject data prop
        const trimmedProps = props.trim();
        const propsWithSpace = trimmedProps ? `${trimmedProps} ` : "";
        return `<HowToIndex ${propsWithSpace}data={${JSON.stringify(indexData)}} />`;
      },
    );
  }

  // Handle ExplanationIndex
  if (hasExplanationIndex) {
    processedContent = processedContent.replace(
      /<ExplanationIndex([^>]*?)\/>/g,
      (match, props) => {
        if (props && /data\s*=/i.test(props)) {
          return match;
        }
        const trimmedProps = props.trim();
        const propsWithSpace = trimmedProps ? `${trimmedProps} ` : "";
        return `<ExplanationIndex ${propsWithSpace}data={${JSON.stringify(indexData)}} />`;
      },
    );
  }

  // Handle AutoDocIndex (fallback)
  if (hasAutoDocIndex) {
    processedContent = processedContent.replace(
      /<AutoDocIndex([^>]*?)\/>/g,
      (match, props) => {
        if (props && /data\s*=/i.test(props)) {
          return match;
        }
        const trimmedProps = props.trim();
        const propsWithSpace = trimmedProps ? `${trimmedProps} ` : "";
        return `<AutoDocIndex ${propsWithSpace}data={${JSON.stringify(indexData)}} />`;
      },
    );
  }

  return processedContent;
}
