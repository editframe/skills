import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import fm from "front-matter";

// Skills directory is at monorepo root /skills/skills/
// In Docker: The telecine directory is mounted at /app, skills mounted at /app/skills
// In development: process.cwd() might be monorepo root or telecine
function getSkillsBasePath(): string {
  const cwd = process.cwd();
  
  // Check if skills/skills exists relative to current directory
  const path1 = join(cwd, "skills", "skills");
  if (existsSync(path1)) {
    return path1;
  }
  
  // Check parent directory (fallback for non-Docker environments)
  const path2 = join(cwd, "..", "skills", "skills");
  if (existsSync(path2)) {
    return path2;
  }
  
  // Fallback to path1 (will fail but at least it's predictable)
  return path1;
}

const TOPIC_LABELS: Record<string, string> = {
  "core-concepts": "Core Concepts",
  "video": "Video",
  "timegroup": "Timegroup",
  "guides": "How-to Guides",
  "components": "Components",
  "tools": "Tools & UI",
  "advanced": "Advanced",
};

function humanize(slug: string): string {
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getTopicLabel(topic: string | null): string {
  if (!topic) return "Getting Started";
  return TOPIC_LABELS[topic] || humanize(topic);
}

interface SkillFrontmatter {
  name: string;
  description: string;
  license: string;
  metadata: {
    author: string;
    version: string;
  };
}

export interface SkillReference {
  name: string;
  title: string;
  description: string;
  type: string;
  topic?: string;
  order: number;
}

interface ReferenceFrontmatter {
  title?: string;
  description?: string;
  type?: string;
  topic?: string;
  order?: number;
}

export interface NavGroup {
  topic: string | null;
  label: string;
  items: {
    type: string;
    items: SkillReference[];
  }[];
}

interface SkillSummary {
  name: string;
  description: string;
  metadata: {
    author: string;
    version: string;
  };
  referenceCount: number;
  references: string[];
  referencesMeta: SkillReference[];
}

interface SkillContent {
  frontmatter: SkillFrontmatter;
  content: string;
}

const TYPE_ORDER: Record<string, number> = {
  tutorial: 0,
  "how-to": 1,
  explanation: 2,
  reference: 3,
};

const TOPIC_ORDER: Record<string, number> = {
  // Learning path order
  "core-concepts": 10,
  "video": 15,
  "timegroup": 16,
  "guides": 30,
  "components": 60,
  "tools": 100,
  "advanced": 120,
};

export const getSkillReferencesMeta = (skillName: string): SkillReference[] => {
  const skillsBasePath = getSkillsBasePath();
  const referencesPath = join(skillsBasePath, skillName, "references");

  if (!existsSync(referencesPath)) {
    return [];
  }

  const files = readdirSync(referencesPath).filter((f) => f.endsWith(".md"));

  return files
    .map((file) => {
      const name = file.replace(".md", "");
      const content = readFileSync(join(referencesPath, file), "utf8");
      const { attributes } = fm<ReferenceFrontmatter>(content);

      return {
        name,
        title: attributes.title || humanize(name),
        description: attributes.description || "",
        type: attributes.type || "reference",
        topic: attributes.topic || undefined,
        order: attributes.order ?? 999,
      };
    })
    .sort((a, b) => a.order - b.order);
};

export const getSkillNav = (skillName: string): NavGroup[] => {
  const refs = getSkillReferencesMeta(skillName);

  const topicMap = new Map<string | null, SkillReference[]>();
  for (const ref of refs) {
    const key = ref.topic ?? null;
    const list = topicMap.get(key);
    if (list) {
      list.push(ref);
    } else {
      topicMap.set(key, [ref]);
    }
  }

  const groups: NavGroup[] = [];

  // Sort topics by learning path order
  const sortedKeys = [...topicMap.keys()].sort((a, b) => {
    if (a === null) return 1; // General last
    if (b === null) return -1;
    const orderA = TOPIC_ORDER[a] ?? 999;
    const orderB = TOPIC_ORDER[b] ?? 999;
    if (orderA !== orderB) return orderA - orderB;
    return a.localeCompare(b); // Fallback to alphabetical
  });

  for (const topic of sortedKeys) {
    const topicRefs = topicMap.get(topic)!;

    // Group by type within this topic
    const typeMap = new Map<string, SkillReference[]>();
    for (const ref of topicRefs) {
      const list = typeMap.get(ref.type);
      if (list) {
        list.push(ref);
      } else {
        typeMap.set(ref.type, [ref]);
      }
    }

    // Sort type groups: tutorial, how-to, explanation, reference
    const typeGroups = [...typeMap.entries()]
      .sort(([a], [b]) => (TYPE_ORDER[a] ?? 99) - (TYPE_ORDER[b] ?? 99))
      .map(([type, items]) => ({
        type,
        items: items.sort((a, b) => a.order - b.order),
      }));

    groups.push({
      topic,
      label: getTopicLabel(topic),
      items: typeGroups,
    });
  }

  return groups;
};

export const getSkillCatalog = (): SkillSummary[] => {
  const skillsBasePath = getSkillsBasePath();
  
  if (!existsSync(skillsBasePath)) {
    return [];
  }

  const skillDirs = readdirSync(skillsBasePath).filter((entry) => {
    const fullPath = join(skillsBasePath, entry);
    return statSync(fullPath).isDirectory();
  });

  return skillDirs.map((skillDir) => {
    const skillPath = join(skillsBasePath, skillDir, "SKILL.md");
    
    if (!existsSync(skillPath)) {
      return null;
    }

    const content = readFileSync(skillPath, "utf8");
    const { attributes } = fm<SkillFrontmatter>(content);

    const referencesMeta = getSkillReferencesMeta(skillDir);
    const references = referencesMeta.map((r) => r.name);

    return {
      name: attributes.name,
      description: attributes.description,
      metadata: attributes.metadata,
      referenceCount: references.length,
      references,
      referencesMeta,
    };
  }).filter((skill): skill is SkillSummary => skill !== null);
};

export const getSkillContent = (skillName: string): SkillContent | null => {
  const skillsBasePath = getSkillsBasePath();
  const skillPath = join(skillsBasePath, skillName, "SKILL.md");

  if (!existsSync(skillPath)) {
    return null;
  }

  const fileContent = readFileSync(skillPath, "utf8");
  const { attributes, body } = fm<SkillFrontmatter>(fileContent);

  return {
    frontmatter: attributes,
    content: body,
  };
};

export const getSkillReference = (
  skillName: string,
  refName: string,
): string | null => {
  const skillsBasePath = getSkillsBasePath();
  const refPath = join(skillsBasePath, skillName, "references", `${refName}.md`);

  if (!existsSync(refPath)) {
    return null;
  }

  return readFileSync(refPath, "utf8");
};

export const getSkillReferences = (skillName: string): string[] => {
  const skillsBasePath = getSkillsBasePath();
  const referencesPath = join(skillsBasePath, skillName, "references");

  if (!existsSync(referencesPath)) {
    return [];
  }

  return readdirSync(referencesPath)
    .filter((file) => file.endsWith(".md"))
    .map((file) => file.replace(".md", ""));
};
