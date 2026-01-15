import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Find all *.sandbox.ts files in the elements package
 */
export function discoverSandboxes(elementsRoot: string): Array<{ filePath: string; elementName: string }> {
  const sandboxes: Array<{ filePath: string; elementName: string }> = [];
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
        sandboxes.push({
          filePath: fullPath,
          elementName,
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
