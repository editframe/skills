import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Extended sandbox info with element tag and usage data
 */
export interface DiscoveredSandbox {
  filePath: string;
  elementName: string;       // sandbox name, e.g., "CompactnessSlider"
  elementTag: string | null; // custom element tag, e.g., "ef-compactness-slider"
  usedTags: string[];        // custom element tags used in render(), e.g., ["ef-css-variable-line"]
  category: string | null;   // top-level category: "elements", "gui", "demos"
  subcategory: string | null; // subcategory within parent, e.g., "media", "controls", "timeline"
}

/**
 * Relationship data for a sandbox
 */
export interface SandboxRelationships {
  elementTag: string | null; // e.g., "ef-compactness-slider"
  uses: string[];            // sandbox names this sandbox uses
  usedBy: string[];          // sandbox names that use this sandbox
}

/**
 * Result of building the sandbox graph
 */
export interface SandboxGraph {
  sandboxes: DiscoveredSandbox[];
  relationships: Record<string, SandboxRelationships>;
}

/**
 * Infer category from folder path based on affordance-based categorization
 */
function inferCategoryFromPath(filePath: string, elementsSrc: string): string | null {
  // Get relative path from elements/src
  const relativePath = path.relative(elementsSrc, filePath).replace(/\\/g, "/");
  
  // Media elements: playback, display, representation
  if (relativePath.includes("/gui/timeline/tracks/")) {
    // Tracks are media elements on timeline
    return "media";
  }
  if (relativePath.includes("/elements/") && (
    relativePath.includes("Timegroup") || 
    relativePath.includes("Video") || 
    relativePath.includes("Audio") ||
    relativePath.includes("Image")
  )) {
    return "media";
  }
  
  // Timeline components: editing, trimming, sequencing
  if (relativePath.includes("/gui/timeline/") && !relativePath.includes("/tracks/")) {
    return "timeline";
  }
  
  // Controls: user input widgets
  if (relativePath.includes("Dial") || relativePath.includes("Slider")) {
    return "controls";
  }
  
  // Panels: UI containers/organizers
  if (relativePath.includes("Panel") || relativePath.includes("Display")) {
    return "panels";
  }
  
  // Visualization: visual data representation
  if (relativePath.includes("Thumbnail") || relativePath.includes("Ruler") || relativePath.includes("waveform")) {
    return "visualization";
  }
  
  // Layout: structure/organization
  if (relativePath.includes("flattenHierarchy") || relativePath.includes("PanZoom")) {
    return "layout";
  }
  
  // Styling: appearance customization
  if (relativePath.includes("CSS") || relativePath.includes("Variable") || relativePath.includes("Compactness")) {
    return "styling";
  }
  
  // Fallback for elements directory
  if (relativePath.startsWith("elements/")) {
    return "media";
  }
  
  // Fallback for gui directory
  if (relativePath.startsWith("gui/")) {
    return "controls";
  }
  
  return null;
}

/**
 * Parse a sandbox file to extract custom element tag, used tags, category, and subcategory
 */
function parseSandboxFile(filePath: string, elementsSrc: string): { 
  elementTag: string | null; 
  usedTags: string[]; 
  category: string | null;
  subcategory: string | null;
} {
  const content = fs.readFileSync(filePath, "utf-8");
  
  // Extract @customElement("ef-xxx") decorator
  const customElementMatch = content.match(/@customElement\(["']([^"']+)["']\)/);
  const elementTag = customElementMatch ? customElementMatch[1] : null;
  
  // Extract category from defineSandbox({ category: "..." })
  // Match category field more flexibly, handling multiline and whitespace
  let category: string | null = null;
  const categoryMatch = content.match(/defineSandbox\s*\(\s*\{[\s\S]*?category\s*:\s*["']([^"']+)["']/);
  if (categoryMatch) {
    category = categoryMatch[1];
  }
  
  // Extract subcategory from defineSandbox({ subcategory: "..." })
  let subcategory: string | null = null;
  const subcategoryMatch = content.match(/defineSandbox\s*\(\s*\{[\s\S]*?subcategory\s*:\s*["']([^"']+)["']/);
  if (subcategoryMatch) {
    subcategory = subcategoryMatch[1];
  }
  
  // If no explicit category, infer from folder path
  if (!category) {
    category = inferCategoryFromPath(filePath, elementsSrc);
  }
  
  // Find the render() function and extract ef-* tags from it
  // Look for render() or render: () => patterns
  const usedTags: string[] = [];
  
  // Match ef-* tags in html`` template literals
  // This regex finds all <ef-xxx tags in the file
  const tagMatches = content.matchAll(/<(ef-[a-z][a-z0-9-]*)/g);
  const seenTags = new Set<string>();
  
  for (const match of tagMatches) {
    const tag = match[1];
    // Skip the element's own tag
    if (tag !== elementTag && !seenTags.has(tag)) {
      seenTags.add(tag);
      usedTags.push(tag);
    }
  }
  
  return { elementTag, usedTags, category, subcategory };
}

/**
 * Find all *.sandbox.ts files in the elements package
 */
export function discoverSandboxes(elementsRoot: string): DiscoveredSandbox[] {
  const sandboxes: DiscoveredSandbox[] = [];
  const elementsSrc = path.join(elementsRoot, "packages", "elements", "src");

  function walkDir(dir: string): void {
    if (!fs.existsSync(dir)) {
      return;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip node_modules and other ignored directories
        if (entry.name === "node_modules" || entry.name.startsWith(".")) {
          continue;
        }
        walkDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".sandbox.ts")) {
        // Extract element name from filename (e.g., "EFDial.sandbox.ts" -> "EFDial")
        const elementName = entry.name.replace(/\.sandbox\.ts$/, "");
        
        // Parse the file for element tag, used tags, category, and subcategory
        const { elementTag, usedTags, category, subcategory } = parseSandboxFile(fullPath, elementsSrc);
        
        sandboxes.push({
          filePath: fullPath,
          elementName,
          elementTag,
          usedTags,
          category,
          subcategory,
        });
      }
    }
  }

  if (fs.existsSync(elementsSrc)) {
    walkDir(elementsSrc);
  }

  return sandboxes;
}

/**
 * Build a relationship graph from discovered sandboxes
 */
export function buildSandboxGraph(elementsRoot: string): SandboxGraph {
  const sandboxes = discoverSandboxes(elementsRoot);
  
  // Build tag -> sandbox name mapping
  const tagToSandbox = new Map<string, string>();
  for (const sandbox of sandboxes) {
    if (sandbox.elementTag) {
      tagToSandbox.set(sandbox.elementTag, sandbox.elementName);
    }
  }
  
  // Initialize relationships
  const relationships: Record<string, SandboxRelationships> = {};
  for (const sandbox of sandboxes) {
    relationships[sandbox.elementName] = {
      elementTag: sandbox.elementTag,
      uses: [],
      usedBy: [],
    };
  }
  
  // Build uses/usedBy relationships
  for (const sandbox of sandboxes) {
    const uses: string[] = [];
    
    for (const tag of sandbox.usedTags) {
      const usedSandboxName = tagToSandbox.get(tag);
      if (usedSandboxName && usedSandboxName !== sandbox.elementName) {
        uses.push(usedSandboxName);
        // Add reverse relationship
        if (relationships[usedSandboxName]) {
          relationships[usedSandboxName].usedBy.push(sandbox.elementName);
        }
      }
    }
    
    relationships[sandbox.elementName].uses = uses;
  }
  
  // Sort uses/usedBy arrays for consistent output
  for (const rel of Object.values(relationships)) {
    rel.uses.sort();
    rel.usedBy.sort();
  }
  
  return { sandboxes, relationships };
}

/**
 * Load a sandbox module and return its config
 * 
 * Note: This function is called server-side, so it needs to handle TypeScript files.
 * In a Vite dev server context, Vite will handle the compilation.
 * For standalone usage, you may need tsx or ts-node.
 */
export async function loadSandbox(filePath: string): Promise<unknown> {
  try {
    // Convert file path to file:// URL for import
    const fileUrl = filePath.startsWith("file://") 
      ? filePath 
      : `file://${filePath}`;
    
    const module = await import(fileUrl);
    return module.default || module;
  } catch (error) {
    // If direct import fails, try without file:// prefix
    try {
      const module = await import(filePath);
      return module.default || module;
    } catch (err2) {
      throw new Error(
        `Failed to load sandbox from ${filePath}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
