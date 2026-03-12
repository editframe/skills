import { join, resolve } from "node:path";
import { existsSync, readFileSync, statSync } from "node:fs";
import { readdir } from "node:fs/promises";
import fm from "front-matter";
import { scanDirectoryForDocs } from "./doc-index-generator";

const appDir = resolve(process.cwd(), "services/web/app");
const docsBasePath = join(appDir, "content", "docs");

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

/**
 * Reads frontmatter from an MDX file
 */
function readMdxFrontmatter(
  filePath: string,
): { title?: string; description?: string } | null {
  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const content = readFileSync(filePath, "utf8");
    const { attributes } = fm<any>(content);

    const title = attributes.meta?.find((attr: any) => attr.title)?.title;
    const description = attributes.meta?.find(
      (attr: any) => attr.name === "description",
    )?.content;

    return { title, description };
  } catch {
    return null;
  }
}

/**
 * Gets element index data for a given element directory path
 *
 * @param elementDirectoryPath - Full directory path to element (e.g., "/path/to/docs/010-elements/008-audio")
 * @param baseSlug - Base slug for generating links (e.g., "/docs/elements/audio")
 */
export async function getElementIndexData(
  elementDirectoryPath: string,
  baseSlug: string,
): Promise<ElementIndexData | null> {
  // Read element index.mdx for element name and description
  const elementIndexPath = join(elementDirectoryPath, "index.mdx");
  const elementMeta = readMdxFrontmatter(elementIndexPath);

  if (!elementMeta) {
    return null;
  }

  const elementName =
    elementMeta.title || baseSlug.split("/").pop() || "Element";
  const elementDescription = elementMeta.description || "";

  // Read tutorial index.mdx
  const tutorialIndexPath = join(
    elementDirectoryPath,
    "010-tutorial",
    "index.mdx",
  );
  const tutorialMeta = readMdxFrontmatter(tutorialIndexPath);
  const tutorial = tutorialMeta
    ? {
        title: tutorialMeta.title || "Tutorial",
        href: `${baseSlug}/tutorial`,
        description: tutorialMeta.description,
      }
    : null;

  // Scan how-to directory for guides
  const howToDirectory = join(elementDirectoryPath, "020-how-to");
  let howToGuides: Array<{
    title: string;
    href: string;
    description?: string;
  }> = [];
  if (existsSync(howToDirectory) && statSync(howToDirectory).isDirectory()) {
    const guides = await scanDirectoryForDocs(
      howToDirectory,
      `${baseSlug}/how-to`,
    );
    howToGuides = guides.map((guide) => ({
      title: guide.title,
      href: guide.slug,
      description: guide.description || undefined,
    }));
  }

  // Scan explanation directory for concepts
  const explanationDirectory = join(elementDirectoryPath, "030-explanation");
  let explanations: Array<{
    title: string;
    href: string;
    description?: string;
  }> = [];
  if (
    existsSync(explanationDirectory) &&
    statSync(explanationDirectory).isDirectory()
  ) {
    const concepts = await scanDirectoryForDocs(
      explanationDirectory,
      `${baseSlug}/explanation`,
    );
    explanations = concepts.map((concept) => ({
      title: concept.title,
      href: concept.slug,
      description: concept.description || undefined,
    }));
  }

  // Read reference index.mdx
  const referenceIndexPath = join(
    elementDirectoryPath,
    "040-reference",
    "index.mdx",
  );
  const referenceMeta = readMdxFrontmatter(referenceIndexPath);
  const reference = referenceMeta
    ? {
        title: referenceMeta.title || "Reference",
        href: `${baseSlug}/reference`,
        description: referenceMeta.description,
      }
    : null;

  return {
    elementName,
    elementDescription,
    tutorial,
    howToGuides,
    explanations,
    reference,
  };
}
