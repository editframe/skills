import { join, resolve } from "node:path";
import {
  scanDirectoryForDocs,
  detectDirectoryType,
} from "./doc-index-generator";

const SECTION_CONFIGS = {
  tutorial: {
    title: "Tutorial",
    description: "Step-by-step learning path",
    sectionTitle: "Tutorial",
    introText: "Learn step-by-step through hands-on examples.",
  },
  "how-to": {
    title: "How-To Guides",
    description: "Task-oriented guides for accomplishing specific goals",
    sectionTitle: "How-To Guides",
    introText: "Task-oriented guides for accomplishing specific goals.",
  },
  explanation: {
    title: "Explanations",
    description:
      "Deep dives into architecture, concepts, and technical advantages",
    sectionTitle: "Explanations",
    introText:
      "Conceptual explanations to deepen your understanding of how things work and why the architecture provides superior outcomes.",
  },
  reference: {
    title: "Reference",
    description: "Complete property and API reference",
    sectionTitle: "Reference",
    introText:
      "Complete technical reference for all properties and attributes.",
  },
} as const;

export interface DocIndexData {
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
}

// Content directory is always at services/web/app/content relative to project root
const appDir = resolve(process.cwd(), "services/web/app");
const docsBasePath = join(appDir, "content", "docs");

/**
 * Builds related documentation sections for a given base slug and current section
 */
export function buildRelatedSections(
  baseSlug: string,
  currentSection: string,
): Array<{ name: string; href: string }> {
  const allSections = [
    { name: "Tutorial", slug: `${baseSlug}/tutorial` },
    { name: "How-To Guides", slug: `${baseSlug}/how-to` },
    { name: "Explanations", slug: `${baseSlug}/explanation` },
    { name: "Reference", slug: `${baseSlug}/reference` },
  ];

  // Filter out the current section
  const normalizedCurrent =
    currentSection === "how-to" ? "how-to" : currentSection;

  return allSections
    .filter((section) => {
      const sectionPath = section.slug.split("/").pop() || "";
      const normalizedSection =
        sectionPath === "how-to" ? "how-to" : sectionPath;
      return normalizedSection !== normalizedCurrent;
    })
    .map((section) => ({
      name: section.name,
      href: section.slug,
    }));
}

/**
 * Detects section type from directory path, handling numbered prefixes
 */
export function detectSectionType(directoryPath: string): string | null {
  const dirName = directoryPath.split("/").pop()?.toLowerCase() || "";

  // Handle numbered prefixes like "020-how-to" or "030-explanation"
  const normalizedName = dirName.replace(/^\d+-/, "");

  if (
    normalizedName === "tutorial" ||
    normalizedName === "how-to" ||
    normalizedName === "explanation" ||
    normalizedName === "reference"
  ) {
    return normalizedName === "how-to" ? "how-to" : normalizedName;
  }

  return null;
}

/**
 * Gets doc index data for a given directory path and base slug
 *
 * @param directoryPath - Full directory path (e.g., "/path/to/docs/010-elements/008-audio/020-how-to")
 * @param baseSlug - Base slug for generating links (e.g., "/docs/elements/audio")
 */
export async function getDocIndexData(
  directoryPath: string,
  baseSlug: string,
): Promise<DocIndexData | null> {
  const sectionType = detectSectionType(directoryPath);

  if (!sectionType) {
    return null;
  }

  const config = SECTION_CONFIGS[sectionType as keyof typeof SECTION_CONFIGS];
  if (!config) {
    return null;
  }

  const docs = await scanDirectoryForDocs(directoryPath, baseSlug);

  if (docs.length === 0) {
    return null;
  }

  const links = docs.map((doc) => ({
    title: doc.title,
    href: doc.slug,
    description: doc.description || undefined,
  }));

  const relatedSections = buildRelatedSections(baseSlug, sectionType);

  return {
    title: config.title,
    sectionTitle: config.sectionTitle,
    introText: config.introText,
    links,
    relatedSections,
  };
}

/**
 * Derives base slug from a docs path
 *
 * If the path includes a section directory (how-to, explanation, etc.), it's removed.
 * Example: "010-elements/008-audio/020-how-to" -> "/docs/elements/audio"
 * Example: "010-elements/008-audio" -> "/docs/elements/audio"
 */
export function deriveBaseSlugFromPath(docsPath: string): string {
  // Remove numbered prefixes and convert to slug format
  let slugPath = docsPath
    .replace(/(\/?\d+-)/g, "/")
    .replace(/^\//, "")
    .replace(/\/$/, "");

  // Check if the last part is a section directory (how-to, explanation, tutorial, reference)
  const parts = slugPath.split("/");
  const lastPart = parts[parts.length - 1];
  const sectionDirectories = ["how-to", "explanation", "tutorial", "reference"];

  // If the last part is a section directory, remove it
  if (sectionDirectories.includes(lastPart)) {
    parts.pop();
  }

  const baseSlug = `/docs/${parts.join("/")}`;

  return baseSlug;
}
