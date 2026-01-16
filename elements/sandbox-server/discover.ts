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
 * Parse a sandbox file to extract custom element tag and used tags
 */
function parseSandboxFile(filePath: string): { elementTag: string | null; usedTags: string[] } {
  const content = fs.readFileSync(filePath, "utf-8");
  
  // Extract @customElement("ef-xxx") decorator
  const customElementMatch = content.match(/@customElement\(["']([^"']+)["']\)/);
  const elementTag = customElementMatch ? customElementMatch[1] : null;
  
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
  
  return { elementTag, usedTags };
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
        
        // Parse the file for element tag and used tags
        const { elementTag, usedTags } = parseSandboxFile(fullPath);
        
        sandboxes.push({
          filePath: fullPath,
          elementName,
          elementTag,
          usedTags,
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
