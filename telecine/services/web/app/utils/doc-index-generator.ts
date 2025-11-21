import { readdir } from "node:fs/promises";
import { join } from "node:path";
import fm from "front-matter";

interface DocFileMetadata {
  title: string;
  description: string;
  slug: string;
  filename: string;
}

interface IndexPageConfig {
  title: string;
  description: string;
  sectionTitle: string;
  introText?: string;
}

const SECTION_CONFIGS: Record<string, IndexPageConfig> = {
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
    description: "Deep dives into architecture, concepts, and technical advantages",
    sectionTitle: "Explanations",
    introText: "Conceptual explanations to deepen your understanding of how things work and why the architecture provides superior outcomes.",
  },
  reference: {
    title: "Reference",
    description: "Complete property and API reference",
    sectionTitle: "Reference",
    introText: "Complete technical reference for all properties and attributes.",
  },
};

export async function scanDirectoryForDocs(
  directory: string,
  baseSlug: string,
): Promise<DocFileMetadata[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const docs: DocFileMetadata[] = [];

  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith(".mdx") && entry.name !== "index.mdx") {
      try {
        const filePath = join(directory, entry.name);
        const { readFileSync } = await import("node:fs");
        const content = readFileSync(filePath, "utf8");
        const { attributes } = fm<any>(content);

        const title = attributes.meta?.find((attr: any) => attr.title)?.title || 
                     entry.name.replace(".mdx", "").replace(/-/g, " ");
        const description = attributes.meta?.find(
          (attr: any) => attr.name === "description"
        )?.content || "";

        const slug = `${baseSlug}/${entry.name.replace(".mdx", "")}`;

        docs.push({
          title,
          description,
          slug,
          filename: entry.name,
        });
      } catch (error) {
        // Skip files that can't be read or parsed
        continue;
      }
    }
  }

  return docs.sort((a, b) => a.title.localeCompare(b.title));
}

function detectDirectoryType(directoryPath: string): string | null {
  const dirName = directoryPath.split("/").pop()?.toLowerCase() || "";
  
  if (dirName === "tutorial" || dirName === "how-to" || dirName === "explanation" || dirName === "reference") {
    return dirName === "how-to" ? "how-to" : dirName;
  }
  
  return null;
}

function generateIndexContent(
  config: IndexPageConfig,
  docs: DocFileMetadata[],
  parentSlug: string,
  currentSection: string,
): string {
  const allSections = [
    { name: "Tutorial", slug: `${parentSlug}/tutorial` },
    { name: "How-To Guides", slug: `${parentSlug}/how-to` },
    { name: "Explanations", slug: `${parentSlug}/explanation` },
    { name: "Reference", slug: `${parentSlug}/reference` },
  ];
  
  // Filter out the current section
  const relatedSections = allSections.filter((section) => {
    const sectionPath = section.slug.split("/").pop() || "";
    const normalizedCurrent = currentSection === "how-to" ? "how-to" : currentSection;
    const normalizedSection = sectionPath === "how-to" ? "how-to" : sectionPath;
    return normalizedSection !== normalizedCurrent;
  });

  const frontmatter = `---
meta:
  - title: ${config.title}
  - name: description
    content: ${config.description}
headers:
    Cache-Control: no-cache
---

## ${config.sectionTitle}

${config.introText || ""}

### Available ${config.sectionTitle === "Reference" ? "Documentation" : "Items"}

${docs.map((doc) => `- [${doc.title}](${doc.slug})${doc.description ? ` - ${doc.description}` : ""}`).join("\n")}

### Related Documentation

${relatedSections.map((section) => `- [${section.name}](${section.slug})`).join("\n")}
`;

  return frontmatter;
}

export async function generateIndexPage(
  directory: string,
  baseSlug: string,
): Promise<string | null> {
  const dirType = detectDirectoryType(directory);
  
  if (!dirType) {
    return null;
  }

  const config = SECTION_CONFIGS[dirType];
  if (!config) {
    return null;
  }

  const docs = await scanDirectoryForDocs(directory, baseSlug);
  
  if (docs.length === 0) {
    return null;
  }

  return generateIndexContent(config, docs, baseSlug, dirType);
}

