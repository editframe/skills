#!/usr/bin/env node

/**
 * Generate LLM-optimized skills from source documents
 *
 * Strips human-only metadata (nav, track, api) and converts structured
 * API data to clean prose for LLM consumption.
 *
 * Source: skills/skills/ (rich frontmatter for humans)
 * Output: skills/skills-generated/ (clean frontmatter for LLMs)
 *
 * Supports:
 * - skill: false — exclude individual files from LLM generation
 * - status: draft — exclude draft skills/files from generation
 * - react: { generate: true } — generate React component docs from HTML element docs
 * - Conditional sections: <!-- html-only -->, <!-- react-only -->, <!-- shared -->
 */

import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, existsSync } from "node:fs";
import { join, basename } from "node:path";

function parseYaml(yaml: string): any {
  const lines = yaml.split("\n");
  const result: any = {};
  let currentKey: string | null = null;
  let currentNestedKey: string | null = null;
  let currentObject: any = null;

  for (const line of lines) {
    if (line.trim() === "") continue;

    const indent = line.match(/^(\s*)/)?.[1]?.length || 0;

    // Top-level key
    if (indent === 0 && line.match(/^\w+:/)) {
      const match = line.match(/^(\w+):\s*(.*)$/);
      if (match) {
        currentKey = match[1];
        currentNestedKey = null;
        currentObject = null;
        const value = match[2];
        if (value === "") {
          result[currentKey] = {};
        } else {
          result[currentKey] = parseValue(value);
        }
      }
    }
    // Second-level key (2 spaces)
    else if (indent === 2 && line.match(/^\s{2}\w+:/)) {
      const match = line.match(/^\s{2}(\w+):\s*(.*)$/);
      if (match && currentKey) {
        currentNestedKey = match[1];
        currentObject = null;
        const value = match[2];
        if (value === "") {
          if (!result[currentKey]) result[currentKey] = {};
          result[currentKey][currentNestedKey] = [];
        } else {
          if (!result[currentKey]) result[currentKey] = {};
          result[currentKey][currentNestedKey] = parseValue(value);
        }
      }
    }
    // Array item (4 spaces + dash)
    else if (indent === 4 && line.match(/^\s{4}-\s+\w+:/)) {
      const match = line.match(/^\s{4}-\s+(\w+):\s*(.*)$/);
      if (match && currentKey && currentNestedKey) {
        currentObject = {};
        if (!Array.isArray(result[currentKey][currentNestedKey])) {
          result[currentKey][currentNestedKey] = [];
        }
        result[currentKey][currentNestedKey].push(currentObject);
        currentObject[match[1]] = parseValue(match[2]);
      }
    }
    // Object property in array (6+ spaces)
    else if (indent >= 6 && line.match(/^\s{6,}\w+:/)) {
      const match = line.match(/^\s+(\w+):\s*(.*)$/);
      if (match && currentObject) {
        currentObject[match[1]] = parseValue(match[2]);
      }
    }
  }

  return result;
}

function parseValue(value: string): any {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value.match(/^-?\d+$/)) return parseInt(value, 10);
  if (value.match(/^-?\d+\.\d+$/)) return parseFloat(value);
  if (value.startsWith('"') && value.endsWith('"')) return value.slice(1, -1);
  return value;
}

function stringifyYaml(obj: any): string {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;

    if (typeof value === "object" && !Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const [k, v] of Object.entries(value)) {
        lines.push(`  ${k}: ${v}`);
      }
    } else {
      lines.push(`${key}: ${value}`);
    }
  }

  return lines.join("\n");
}

function parseFrontmatter(content: string): { attributes: any; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { attributes: {}, body: content };
  }

  const attributes = parseYaml(match[1]);
  const body = match[2];

  return { attributes, body };
}

interface ApiAttribute {
  name: string;
  type: string;
  required?: boolean;
  default?: string | number | boolean;
  description: string;
  values?: string[];
}

interface ApiMetadata {
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

interface ReactConfig {
  generate?: boolean;
  componentName?: string;
  importPath?: string;
  propMapping?: Record<string, string>;
  additionalProps?: ApiAttribute[];
  nav?: any;
  outputFilename?: string;
}

interface SourceFrontmatter {
  title?: string;
  description?: string;
  type?: string;
  topic?: string;
  order?: number;
  nav?: any;
  track?: string;
  track_step?: number;
  track_title?: string;
  prerequisites?: string[];
  next_steps?: string[];
  api?: ApiMetadata;
  sections?: any[];
  // LLM-only fields
  name?: string;
  license?: string;
  metadata?: {
    author: string;
    version: string;
  };
  // Generation control
  skill?: boolean;
  status?: string;
  react?: ReactConfig;
}

// --- Conditional section processing ---

function processConditionalSections(body: string, target: "html" | "react"): string {
  const remove = target === "html" ? "react-only" : "html-only";
  const keep = target === "html" ? "html-only" : "react-only";

  // Remove opposite-platform sections
  body = body.replace(new RegExp(`<!-- ${remove} -->[\\s\\S]*?<!-- \\/${remove} -->`, "g"), "");
  // Unwrap same-platform markers (keep the content)
  body = body.replace(new RegExp(`<!-- ${keep} -->\\n?`, "g"), "");
  body = body.replace(new RegExp(`<!-- \\/${keep} -->\\n?`, "g"), "");
  // Remove shared markers (keep the content)
  body = body.replace(/<!-- shared -->\n?/g, "");
  body = body.replace(/<!-- \/shared -->\n?/g, "");
  // Clean up any double blank lines left by removal
  body = body.replace(/\n{3,}/g, "\n\n");
  return body;
}

// --- React generation from HTML sources ---

function transformApiForReact(api: ApiMetadata, reactConfig: ReactConfig): ApiMetadata {
  const reactApi: ApiMetadata = {};
  const propMapping = reactConfig.propMapping || {};

  // Convert HTML attributes to React properties with name mapping
  if (api.attributes && api.attributes.length > 0) {
    reactApi.properties = api.attributes.map(attr => ({
      ...attr,
      name: propMapping[attr.name] || attr.name,
    }));
  }

  // Add React-specific props
  if (reactConfig.additionalProps && reactConfig.additionalProps.length > 0) {
    reactApi.properties = [
      ...(reactApi.properties || []),
      ...reactConfig.additionalProps,
    ];
  }

  // Pass through methods and functions unchanged
  if (api.methods) reactApi.methods = api.methods;
  if (api.functions) reactApi.functions = api.functions;

  return reactApi;
}

function generateReactVariant(
  sourcePath: string,
  reactOutputDir: string,
  attributes: SourceFrontmatter,
) {
  const reactConfig = attributes.react!;
  const filename = reactConfig.outputFilename || basename(sourcePath);
  const outputPath = join(reactOutputDir, filename);

  // Transform title: "Video Element" -> "Video Component" (or use componentName)
  const componentName = reactConfig.componentName || attributes.title?.replace(" Element", "") || "";
  const reactTitle = `${componentName} Component`;

  // Build React LLM frontmatter
  const llmFrontmatter: any = {
    name: reactTitle,
    description: attributes.description,
  };

  // Transform API metadata
  const reactApi = attributes.api ? transformApiForReact(attributes.api, reactConfig) : undefined;

  // Process body for React target
  let body = processConditionalSections(parseFrontmatter(readFileSync(sourcePath, "utf8")).body, "react");

  // Inject React API prose after h1
  if (reactApi) {
    const apiProse = apiToProse(reactApi);
    const h1Match = body.match(/^# .+$/m);
    if (h1Match && h1Match.index !== undefined) {
      const afterH1 = h1Match.index + h1Match[0].length;
      body = body.substring(0, afterH1) + "\n\n" + apiProse + "\n" + body.substring(afterH1);
    }
  }

  // Ensure output directory exists
  const outputDir = join(reactOutputDir);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const output = `---\n${stringifyYaml(llmFrontmatter).trim()}\n---\n\n${body}`;
  writeFileSync(outputPath, output, "utf8");
  console.log(`  React variant: ${outputPath}`);
}

// --- API to prose conversion ---

function apiToProse(api: ApiMetadata): string {
  const sections: string[] = [];

  if (api.attributes && api.attributes.length > 0) {
    sections.push("## Attributes\n");
    for (const attr of api.attributes) {
      const required = attr.required ? " (required)" : "";
      const defaultVal = attr.default !== undefined ? `, default: ${attr.default}` : "";
      sections.push(`- **${attr.name}** (${attr.type}${defaultVal})${required} - ${attr.description}`);
    }
  }

  if (api.properties && api.properties.length > 0) {
    sections.push("\n## Properties\n");
    for (const prop of api.properties) {
      const defaultVal = prop.default !== undefined ? `, default: ${prop.default}` : "";
      sections.push(`- **${prop.name}** (${prop.type}${defaultVal}) - ${prop.description}`);
    }
  }

  if (api.methods && api.methods.length > 0) {
    sections.push("\n## Methods\n");
    for (const method of api.methods) {
      sections.push(`- **${method.signature}** - ${method.description}`);
      if (method.returns) {
        sections.push(`  - Returns: ${method.returns}`);
      }
    }
  }

  if (api.functions && api.functions.length > 0) {
    sections.push("\n## Functions\n");
    for (const func of api.functions) {
      sections.push(`- **${func.signature}** - ${func.description}`);
      if (func.returns) {
        sections.push(`  - Returns: ${func.returns}`);
      }
    }
  }

  return sections.join("\n");
}

// --- File generation ---

function generateSkillFile(sourcePath: string, outputPath: string, target: "html" | "react" = "html") {
  const content = readFileSync(sourcePath, "utf8");
  const parsed = parseFrontmatter(content);
  const attributes = parsed.attributes as SourceFrontmatter;

  // Skip files marked as non-skill
  if (attributes.skill === false) {
    console.log(`  Skipping (skill: false): ${sourcePath}`);
    return;
  }

  // Skip draft files
  if (attributes.status === "draft") {
    console.log(`  Skipping (status: draft): ${sourcePath}`);
    return;
  }

  // Build clean LLM frontmatter
  const llmFrontmatter: any = {
    name: attributes.title || attributes.name,
    description: attributes.description,
  };

  // Preserve LLM-specific fields if they exist
  if (attributes.license) {
    llmFrontmatter.license = attributes.license;
  }
  if (attributes.metadata) {
    llmFrontmatter.metadata = attributes.metadata;
  }

  let body = parsed.body;

  // Process conditional sections
  body = processConditionalSections(body, target);

  // If API metadata exists, convert to prose and inject after h1
  if (attributes.api) {
    const apiProse = apiToProse(attributes.api);
    // Find the first h1 and inject API prose after it
    const h1Match = body.match(/^# .+$/m);
    if (h1Match && h1Match.index !== undefined) {
      const afterH1 = h1Match.index + h1Match[0].length;
      body = body.substring(0, afterH1) + "\n\n" + apiProse + "\n" + body.substring(afterH1);
    }
  }

  // Write generated file
  const output = `---\n${stringifyYaml(llmFrontmatter).trim()}\n---\n\n${body}`;
  writeFileSync(outputPath, output, "utf8");
}

function generateSkillsRecursive(sourceDir: string, outputDir: string, reactOutputBaseDir?: string) {
  // Check if this directory's SKILL.md marks it as draft
  const skillMdPath = join(sourceDir, "SKILL.md");
  if (existsSync(skillMdPath)) {
    const content = readFileSync(skillMdPath, "utf8");
    const parsed = parseFrontmatter(content);
    if (parsed.attributes.status === "draft") {
      console.log(`Skipping draft skill: ${sourceDir}`);
      return;
    }
  }

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const entries = readdirSync(sourceDir);
  const isElementsComposition = sourceDir.includes("elements-composition");

  for (const entry of entries) {
    const sourcePath = join(sourceDir, entry);
    const outputPath = join(outputDir, entry);
    const stat = statSync(sourcePath);

    if (stat.isDirectory()) {
      generateSkillsRecursive(sourcePath, outputPath, reactOutputBaseDir);
    } else if (entry.endsWith(".md")) {
      console.log(`Generating: ${sourcePath}`);

      // Determine target based on directory context
      const target = sourceDir.includes("react-composition") ? "react" : "html";
      generateSkillFile(sourcePath, outputPath, target);

      // If this is an elements-composition file with react.generate, also produce React output
      if (isElementsComposition && reactOutputBaseDir) {
        const content = readFileSync(sourcePath, "utf8");
        const parsed = parseFrontmatter(content);
        const attributes = parsed.attributes as SourceFrontmatter;

        if (attributes.react?.generate) {
          // Determine the React output directory (mirror the references/ subdir)
          const relativeDir = sourceDir.includes("references") ? "references" : "";
          const reactOutDir = relativeDir
            ? join(reactOutputBaseDir, relativeDir)
            : reactOutputBaseDir;

          generateReactVariant(sourcePath, reactOutDir, attributes);
        }
      }
    }
  }
}

// Main execution
const monorepoRoot = join(process.cwd());
const sourceDir = join(monorepoRoot, "skills", "skills");
const outputDir = join(monorepoRoot, "skills", "skills-generated");

// React output base for cross-generated files
const reactOutputBaseDir = join(outputDir, "react-composition");

console.log("Generating LLM-optimized skills...");
console.log(`Source: ${sourceDir}`);
console.log(`Output: ${outputDir}`);

generateSkillsRecursive(sourceDir, outputDir, reactOutputBaseDir);

console.log("Done!");
