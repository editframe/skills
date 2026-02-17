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

// Simple YAML serializer for frontmatter
function toYAML(obj: Record<string, any>, indent = 0): string {
  const lines: string[] = [];
  const prefix = "  ".repeat(indent);
  
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    
    if (typeof value === "string") {
      // Escape strings with special characters
      if (value.includes("\n") || value.includes(":") || value.includes("#")) {
        lines.push(`${prefix}${key}: "${value.replace(/"/g, '\\"')}"`);
      } else {
        lines.push(`${prefix}${key}: ${value}`);
      }
    } else if (typeof value === "number" || typeof value === "boolean") {
      lines.push(`${prefix}${key}: ${value}`);
    } else if (Array.isArray(value)) {
      lines.push(`${prefix}${key}:`);
      for (const item of value) {
        if (typeof item === "object") {
          lines.push(`${prefix}  -`);
          const itemYaml = toYAML(item, indent + 2);
          lines.push(itemYaml.split("\n").map(l => `  ${l}`).join("\n"));
        } else {
          lines.push(`${prefix}  - ${item}`);
        }
      }
    } else if (typeof value === "object") {
      lines.push(`${prefix}${key}:`);
      lines.push(toYAML(value, indent + 1));
    }
  }
  
  return lines.join("\n");
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
  title?: string;
  description: string;
  status?: string;
  order?: number;
  license: string;
  metadata: {
    author: string;
    version: string;
  };
}

export interface NavMetadata {
  parent?: string;
  priority?: number;
  related?: string[];
  icon?: string;
}

export interface ApiAttribute {
  name: string;
  type: string;
  required?: boolean;
  default?: string | number | boolean;
  description: string;
  values?: string[];
}

export interface ApiMetadata {
  attributes?: ApiAttribute[];
  properties?: ApiAttribute[];
  methods?: {
    name: string;
    signature: string;
    description: string;
    returns?: string;
  }[];
  functions?: {
    name: string;
    signature: string;
    description: string;
    returns?: string;
  }[];
}

export interface SectionDef {
  slug: string;
  title: string;
  heading: string;
  type: string;
  description?: string;
  nav?: NavMetadata;
}

export interface SkillReference {
  name: string;
  title: string;
  description: string;
  type: string;
  topic?: string;
  order: number;
  parentRef?: string;
  nav?: NavMetadata;
  track?: string;
  track_step?: number;
  track_title?: string;
  prerequisites?: string[];
  next_steps?: string[];
}

interface ReactConfig {
  generate?: boolean;
  componentName?: string;
  importPath?: string;
  propMapping?: Record<string, string>;
  additionalProps?: ApiAttribute[];
  nav?: NavMetadata;
  outputFilename?: string;
}

interface ReferenceFrontmatter {
  title?: string;
  description?: string;
  type?: string;
  topic?: string;
  order?: number;
  sections?: SectionDef[];
  nav?: NavMetadata;
  track?: string;
  track_step?: number;
  track_title?: string;
  prerequisites?: string[];
  next_steps?: string[];
  api?: ApiMetadata;
  react?: ReactConfig;
}

export interface NavGroup {
  topic: string | null;
  label: string;
  items: {
    type: string;
    items: SkillReference[];
  }[];
}

export interface NavNode {
  path: string;
  label: string;
  priority: number;
  icon?: string;
  children: NavNode[];
  items: SkillReference[];
}

interface SkillSummary {
  name: string;
  title: string;
  description: string;
  metadata: {
    author: string;
    version: string;
  };
  order: number;
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

// --- Conditional section processing ---

function processConditionalSections(body: string, target: "html" | "react"): string {
  const remove = target === "html" ? "react-only" : "html-only";
  const keep = target === "html" ? "html-only" : "react-only";

  body = body.replace(new RegExp(`<!-- ${remove} -->[\\s\\S]*?<!-- \\/${remove} -->`, "g"), "");
  body = body.replace(new RegExp(`<!-- ${keep} -->\\n?`, "g"), "");
  body = body.replace(new RegExp(`<!-- \\/${keep} -->\\n?`, "g"), "");
  body = body.replace(/<!-- shared -->\n?/g, "");
  body = body.replace(/<!-- \/shared -->\n?/g, "");
  body = body.replace(/\n{3,}/g, "\n\n");
  return body;
}

function stripHtmlComments(body: string): string {
  // Split on fenced code blocks to avoid stripping comments inside them
  const parts = body.split(/(```[\s\S]*?```)/g);
  for (let i = 0; i < parts.length; i += 2) {
    // Even indices are outside code blocks
    parts[i] = parts[i]!.replace(/<!--[\s\S]*?-->/g, "");
  }
  return parts.join("").replace(/\n{3,}/g, "\n\n");
}

function prepareForMdx(content: string): string {
  const parsed = fm(content);
  let body = processConditionalSections(parsed.body, "html");
  body = stripHtmlComments(body);
  const frontmatterMatch = content.match(/^---\n[\s\S]*?\n---/);
  const frontmatter = frontmatterMatch ? frontmatterMatch[0] : "";
  return `${frontmatter}\n\n${body}`;
}

function transformApiForReact(api: ApiMetadata, reactConfig: ReactConfig): ApiMetadata {
  const reactApi: ApiMetadata = {};
  const propMapping = reactConfig.propMapping || {};

  if (api.attributes && api.attributes.length > 0) {
    reactApi.properties = api.attributes.map(attr => ({
      ...attr,
      name: propMapping[attr.name] || attr.name,
    }));
  }

  if (reactConfig.additionalProps && reactConfig.additionalProps.length > 0) {
    reactApi.properties = [
      ...(reactApi.properties || []),
      ...reactConfig.additionalProps,
    ];
  }

  if (api.methods) reactApi.methods = api.methods;
  if (api.functions) reactApi.functions = api.functions;

  return reactApi;
}

function buildReactFrontmatter(attributes: ReferenceFrontmatter): Record<string, any> {
  const reactConfig = attributes.react!;
  const componentName = reactConfig.componentName || attributes.title?.replace(" Element", "") || "";
  const reactTitle = `${componentName} Component`;

  const reactFrontmatter: Record<string, any> = {
    title: reactTitle,
    description: attributes.description,
    type: attributes.type,
  };

  if (attributes.topic) reactFrontmatter.topic = attributes.topic;
  if (attributes.order !== undefined) reactFrontmatter.order = attributes.order;
  if (reactConfig.nav) {
    reactFrontmatter.nav = reactConfig.nav;
  } else if (attributes.nav) {
    reactFrontmatter.nav = attributes.nav;
  }
  if (attributes.track) reactFrontmatter.track = attributes.track;
  if (attributes.track_step) reactFrontmatter.track_step = attributes.track_step;
  if (attributes.track_title) reactFrontmatter.track_title = attributes.track_title;

  if (attributes.api) {
    reactFrontmatter.api = transformApiForReact(attributes.api, reactConfig);
  }

  return reactFrontmatter;
}

function generateReactReferenceContent(
  htmlContent: string,
  attributes: ReferenceFrontmatter,
): string {
  const reactFrontmatter = buildReactFrontmatter(attributes);
  const parsed = fm(htmlContent);
  let body = processConditionalSections(parsed.body, "react");
  body = stripHtmlComments(body);
  return `---\n${toYAML(reactFrontmatter)}\n---\n${body}`;
}

// --- React generation cache (production only) ---

const isProduction = process.env.NODE_ENV === "production";
const reactContentCache = new Map<string, string>();
const reactMetaCache = new Map<string, SkillReference[]>();

function getElementsReactSources(): { name: string; filePath: string; attributes: ReferenceFrontmatter }[] {
  const skillsBasePath = getSkillsBasePath();
  const elementsRefsPath = join(skillsBasePath, "elements-composition", "references");

  if (!existsSync(elementsRefsPath)) return [];

  const files = readdirSync(elementsRefsPath).filter(f => f.endsWith(".md"));
  const sources: { name: string; filePath: string; attributes: ReferenceFrontmatter }[] = [];

  for (const file of files) {
    const filePath = join(elementsRefsPath, file);
    const content = readFileSync(filePath, "utf8");
    const { attributes } = fm<ReferenceFrontmatter>(content);

    if (attributes.react?.generate) {
      sources.push({
        name: file.replace(".md", ""),
        filePath,
        attributes,
      });
    }
  }

  return sources;
}

function getGeneratedReactReference(refName: string): string | null {
  const cacheKey = `ref:${refName}`;
  if (isProduction) {
    const cached = reactContentCache.get(cacheKey);
    if (cached) return cached;
  }

  const skillsBasePath = getSkillsBasePath();
  const htmlPath = join(skillsBasePath, "elements-composition", "references", `${refName}.md`);

  if (!existsSync(htmlPath)) return null;

  const content = readFileSync(htmlPath, "utf8");
  const { attributes } = fm<ReferenceFrontmatter>(content);

  if (!attributes.react?.generate) return null;

  const result = generateReactReferenceContent(content, attributes);
  if (isProduction) {
    reactContentCache.set(cacheKey, result);
  }

  return result;
}

function getGeneratedReactSection(refName: string, sectionSlug: string): string | null {
  const cacheKey = `section:${refName}~${sectionSlug}`;
  if (isProduction) {
    const cached = reactContentCache.get(cacheKey);
    if (cached) return cached;
  }

  const skillsBasePath = getSkillsBasePath();
  const htmlPath = join(skillsBasePath, "elements-composition", "references", `${refName}.md`);

  if (!existsSync(htmlPath)) return null;

  const content = readFileSync(htmlPath, "utf8");
  const { attributes, body } = fm<ReferenceFrontmatter>(content);

  if (!attributes.react?.generate) return null;
  if (!attributes.sections || attributes.sections.length === 0) return null;

  const sectionIndex = attributes.sections.findIndex((s) => s.slug === sectionSlug);
  if (sectionIndex === -1) return null;

  const section = attributes.sections[sectionIndex];
  if (!section) return null;

  const nextSection = attributes.sections[sectionIndex + 1];

  const sectionHeadingPattern = new RegExp(`^## ${section.heading}`, "m");
  const sectionMatch = body.match(sectionHeadingPattern);
  if (!sectionMatch || sectionMatch.index === undefined) return null;

  let sectionBody: string;
  if (nextSection) {
    const nextHeadingPattern = new RegExp(`^## ${nextSection.heading}`, "m");
    const nextMatch = body.substring(sectionMatch.index).match(nextHeadingPattern);
    if (nextMatch && nextMatch.index !== undefined) {
      sectionBody = body.substring(sectionMatch.index, sectionMatch.index + nextMatch.index).trim();
    } else {
      sectionBody = body.substring(sectionMatch.index).trim();
    }
  } else {
    sectionBody = body.substring(sectionMatch.index).trim();
  }

  // Process conditional sections for React
  sectionBody = processConditionalSections(sectionBody, "react");
  sectionBody = stripHtmlComments(sectionBody);

  const sectionFrontmatter: Record<string, any> = {
    title: section.title,
    description: section.description || attributes.description || "",
    type: section.type,
  };

  if (attributes.topic) sectionFrontmatter.topic = attributes.topic;
  if (attributes.order !== undefined) sectionFrontmatter.order = attributes.order;

  const result = `---\n${toYAML(sectionFrontmatter)}\n---\n\n${sectionBody}`;
  if (isProduction) {
    reactContentCache.set(cacheKey, result);
  }

  return result;
}

export const getSkillReferencesMeta = (skillName: string): SkillReference[] => {
  // For react-composition, check production cache
  if (skillName === "react-composition" && isProduction) {
    const cached = reactMetaCache.get("react-composition");
    if (cached) return cached;
  }

  const skillsBasePath = getSkillsBasePath();
  const referencesPath = join(skillsBasePath, skillName, "references");

  if (!existsSync(referencesPath)) {
    return [];
  }

  const files = readdirSync(referencesPath).filter((f) => f.endsWith(".md"));

  const refs: SkillReference[] = [];

  for (const file of files) {
    const name = file.replace(".md", "");
    const content = readFileSync(join(referencesPath, file), "utf8");
    const { attributes } = fm<ReferenceFrontmatter>(content);

    // If file has sections, emit root entry + section entries
    if (attributes.sections && attributes.sections.length > 0) {
      // Root entry
      refs.push({
        name,
        title: attributes.title || humanize(name),
        description: attributes.description || "",
        type: attributes.type || "reference",
        topic: attributes.topic || undefined,
        order: attributes.order ?? 999,
        nav: attributes.nav,
        track: attributes.track,
        track_step: attributes.track_step,
        track_title: attributes.track_title,
        prerequisites: attributes.prerequisites,
        next_steps: attributes.next_steps,
      });

      // Section entries
      for (const section of attributes.sections) {
        refs.push({
          name: `${name}~${section.slug}`,
          title: section.title,
          description: section.description || "",
          type: section.type,
          topic: attributes.topic || undefined,
          order: attributes.order ?? 999,
          parentRef: name,
          nav: section.nav || attributes.nav,
          track: attributes.track,
          track_step: attributes.track_step,
          track_title: attributes.track_title,
          prerequisites: attributes.prerequisites,
          next_steps: attributes.next_steps,
        });
      }
    } else {
      // No sections - emit single entry
      refs.push({
        name,
        title: attributes.title || humanize(name),
        description: attributes.description || "",
        type: attributes.type || "reference",
        topic: attributes.topic || undefined,
        order: attributes.order ?? 999,
        nav: attributes.nav,
        track: attributes.track,
        track_step: attributes.track_step,
        track_title: attributes.track_title,
        prerequisites: attributes.prerequisites,
        next_steps: attributes.next_steps,
      });
    }
  }

  // For react-composition, include virtual refs generated from elements-composition HTML sources
  if (skillName === "react-composition") {
    const elementsSources = getElementsReactSources();
    for (const source of elementsSources) {
      // Skip if an actual React file with the same name already exists
      if (refs.some(r => r.name === source.name)) continue;

      const reactConfig = source.attributes.react!;
      const componentName = reactConfig.componentName || source.attributes.title?.replace(" Element", "") || "";
      const reactTitle = `${componentName} Component`;

      refs.push({
        name: source.name,
        title: reactTitle,
        description: source.attributes.description || "",
        type: source.attributes.type || "reference",
        topic: source.attributes.topic || undefined,
        order: source.attributes.order ?? 999,
        nav: reactConfig.nav || source.attributes.nav,
        track: source.attributes.track,
        track_step: source.attributes.track_step,
        track_title: source.attributes.track_title,
        prerequisites: source.attributes.prerequisites,
        next_steps: source.attributes.next_steps,
      });
    }

    const sorted = refs.sort((a, b) => a.order - b.order);
    if (isProduction) reactMetaCache.set("react-composition", sorted);
    return sorted;
  }

  return refs.sort((a, b) => a.order - b.order);
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

// Well-known top-level sections
const TOP_LEVEL_SECTIONS: Record<string, { priority: number; icon: string }> = {
  "Quick Start": { priority: 0, icon: "🚀" },
  "Concepts": { priority: 10, icon: "🧠" },
  "Elements": { priority: 20, icon: "📖" },
  "Guides": { priority: 30, icon: "📚" },
};

function buildNavTree(refs: SkillReference[]): NavNode[] {
  const nodeMap = new Map<string, NavNode>();
  
  // Helper to get or create a node
  const getNode = (path: string): NavNode => {
    if (nodeMap.has(path)) {
      return nodeMap.get(path)!;
    }
    
    const parts = path.split(" / ");
    const label = parts[parts.length - 1] || "";
    const topLevel = parts[0] || "";
    
    const node: NavNode = {
      path,
      label,
      priority: 999,
      icon: topLevel ? TOP_LEVEL_SECTIONS[topLevel]?.icon : undefined,
      children: [],
      items: [],
    };
    
    // Apply top-level priority if this is a top-level node
    if (parts.length === 1 && topLevel && TOP_LEVEL_SECTIONS[topLevel]) {
      node.priority = TOP_LEVEL_SECTIONS[topLevel].priority;
    }
    
    nodeMap.set(path, node);
    return node;
  };
  
  // Process all references
  for (const ref of refs) {
    if (ref.nav?.parent) {
      // Get or create the parent node
      const parentNode = getNode(ref.nav.parent);
      
      // Add this reference to the parent's items
      parentNode.items.push(ref);
      
      // Update parent priority if this ref has a lower priority
      if (ref.nav.priority !== undefined && ref.nav.priority < parentNode.priority) {
        parentNode.priority = ref.nav.priority;
      }
      
      // Build parent hierarchy
      const parts = ref.nav.parent.split(" / ");
      for (let i = parts.length - 1; i > 0; i--) {
        const childPath = parts.slice(0, i + 1).join(" / ");
        const parentPath = parts.slice(0, i).join(" / ");
        
        const childNode = getNode(childPath);
        const parentNode = getNode(parentPath);
        
        // Add child to parent if not already present
        if (!parentNode.children.find(c => c.path === childPath)) {
          parentNode.children.push(childNode);
        }
      }
    }
  }
  
  // Sort items within each node by priority
  for (const node of nodeMap.values()) {
    node.items.sort((a, b) => {
      const aPriority = a.nav?.priority ?? 999;
      const bPriority = b.nav?.priority ?? 999;
      return aPriority - bPriority;
    });
    
    // Sort children by priority
    node.children.sort((a, b) => a.priority - b.priority);
  }
  
  // Find root nodes (nodes with no parent in the map)
  const allPaths = new Set(nodeMap.keys());
  const childPaths = new Set<string>();
  
  for (const node of nodeMap.values()) {
    for (const child of node.children) {
      childPaths.add(child.path);
    }
  }
  
  const rootNodes: NavNode[] = [];
  for (const path of allPaths) {
    if (!childPaths.has(path)) {
      rootNodes.push(nodeMap.get(path)!);
    }
  }
  
  // Sort root nodes by priority
  rootNodes.sort((a, b) => a.priority - b.priority);
  
  return rootNodes;
}

export const getSkillNavTree = (skillName: string): NavNode[] => {
  const refs = getSkillReferencesMeta(skillName);
  return buildNavTree(refs);
};

export const getSkillNames = (): { name: string; title: string; description: string }[] => {
  const skillsBasePath = getSkillsBasePath();

  if (!existsSync(skillsBasePath)) {
    return [];
  }

  const skillDirs = readdirSync(skillsBasePath).filter((entry) => {
    const fullPath = join(skillsBasePath, entry);
    return statSync(fullPath).isDirectory();
  });

  return skillDirs
    .map((skillDir) => {
      const skillPath = join(skillsBasePath, skillDir, "SKILL.md");
      if (!existsSync(skillPath)) return null;
      const content = readFileSync(skillPath, "utf8");
      const { attributes } = fm<SkillFrontmatter>(content);
      if (attributes.status === "draft") return null;
      return {
        name: attributes.name,
        title: attributes.title || humanize(attributes.name),
        description: attributes.description,
        order: attributes.order ?? 999,
      };
    })
    .filter((s): s is { name: string; title: string; description: string; order: number } => s !== null)
    .sort((a, b) => a.order - b.order);
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

    if (attributes.status === "draft") return null;

    const referencesMeta = getSkillReferencesMeta(skillDir);
    const references = referencesMeta.map((r) => r.name);

    return {
      name: attributes.name,
      title: attributes.title || humanize(attributes.name),
      description: attributes.description,
      metadata: attributes.metadata,
      order: attributes.order ?? 999,
      referenceCount: references.length,
      references,
      referencesMeta,
    };
  })
  .filter((skill): skill is SkillSummary => skill !== null)
  .sort((a, b) => a.order - b.order);
};

export const getSkillContent = (skillName: string): SkillContent | null => {
  const skillsBasePath = getSkillsBasePath();
  const skillPath = join(skillsBasePath, skillName, "SKILL.md");

  if (!existsSync(skillPath)) {
    return null;
  }

  const fileContent = readFileSync(skillPath, "utf8");
  const { attributes, body } = fm<SkillFrontmatter>(fileContent);

  let processed = processConditionalSections(body, "html");
  processed = stripHtmlComments(processed);

  return {
    frontmatter: attributes,
    content: processed,
  };
};

export const getSkillReference = (
  skillName: string,
  refName: string,
): string | null => {
  const skillsBasePath = getSkillsBasePath();
  const refPath = join(skillsBasePath, skillName, "references", `${refName}.md`);

  if (!existsSync(refPath)) {
    // For react-composition, try generating from elements-composition HTML source
    if (skillName === "react-composition") {
      return getGeneratedReactReference(refName);
    }
    return null;
  }

  const content = readFileSync(refPath, "utf8");
  const parsed = fm<ReferenceFrontmatter>(content);

  // If file has sections, return only the root portion (above first section heading)
  if (parsed.attributes.sections && parsed.attributes.sections.length > 0) {
    const firstSection = parsed.attributes.sections[0];
    if (firstSection) {
      const h2Pattern = new RegExp(`^## ${firstSection.heading}`, "m");
      const match = parsed.body.match(h2Pattern);
      
      if (match && match.index !== undefined) {
        // Extract original frontmatter from content
        const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (fmMatch) {
          const originalFrontmatter = fmMatch[0];
          const rootBody = parsed.body.substring(0, match.index).trim();
          return prepareForMdx(`${originalFrontmatter}\n\n${rootBody}`);
        }
      }
    }
  }

  // No sections or section not found - return full file
  return prepareForMdx(content);
};

export const getSkillReferenceSection = (
  skillName: string,
  refName: string,
  sectionSlug: string,
): string | null => {
  const skillsBasePath = getSkillsBasePath();
  const refPath = join(skillsBasePath, skillName, "references", `${refName}.md`);

  if (!existsSync(refPath)) {
    // For react-composition, try generating from elements-composition HTML source
    if (skillName === "react-composition") {
      return getGeneratedReactSection(refName, sectionSlug);
    }
    return null;
  }

  const content = readFileSync(refPath, "utf8");
  const { attributes, body } = fm<ReferenceFrontmatter>(content);

  if (!attributes.sections || attributes.sections.length === 0) {
    return null;
  }

  // Find the section definition
  const sectionIndex = attributes.sections.findIndex((s) => s.slug === sectionSlug);
  if (sectionIndex === -1) {
    return null;
  }

  const section = attributes.sections[sectionIndex];
  if (!section) {
    return null;
  }

  const nextSection = attributes.sections[sectionIndex + 1];

  // Find the section heading in the body
  const sectionHeadingPattern = new RegExp(`^## ${section.heading}`, "m");
  const sectionMatch = body.match(sectionHeadingPattern);

  if (!sectionMatch || sectionMatch.index === undefined) {
    return null;
  }

  let sectionBody: string;

  if (nextSection) {
    // Extract content from this section heading to the next section heading
    const nextHeadingPattern = new RegExp(`^## ${nextSection.heading}`, "m");
    const nextMatch = body.substring(sectionMatch.index).match(nextHeadingPattern);

    if (nextMatch && nextMatch.index !== undefined) {
      sectionBody = body.substring(
        sectionMatch.index,
        sectionMatch.index + nextMatch.index
      ).trim();
    } else {
      // Next section heading not found, take to end
      sectionBody = body.substring(sectionMatch.index).trim();
    }
  } else {
    // Last section, take to end of file
    sectionBody = body.substring(sectionMatch.index).trim();
  }

  // Create modified frontmatter for the section page
  const sectionFrontmatter: Record<string, any> = {
    title: section.title,
    description: section.description || attributes.description || "",
    type: section.type,
  };
  
  // Only include optional fields if they exist
  if (attributes.topic) sectionFrontmatter.topic = attributes.topic;
  if (attributes.order !== undefined) sectionFrontmatter.order = attributes.order;

  return prepareForMdx(`---\n${toYAML(sectionFrontmatter)}\n---\n\n${sectionBody}`);
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
