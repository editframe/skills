// CSS loader for tsx to handle .css?inline imports
// This allows running TypeScript files that import CSS without building
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve as resolvePath } from "node:path";

export async function resolve(specifier, context, nextResolve) {
  // Handle CSS imports with ?inline query parameter
  if (specifier.endsWith(".css?inline")) {
    const cssPath = specifier.replace("?inline", "");
    // Resolve the CSS file path relative to the importing file
    const parentPath = context.parentURL
      ? fileURLToPath(context.parentURL)
      : process.cwd();
    const parentDir = dirname(parentPath);
    const resolvedPath = resolvePath(parentDir, cssPath);

    // Return a special URL that we can recognize in the load hook
    return {
      shortCircuit: true,
      url: `css-inline://${resolvedPath}`,
    };
  }

  // Handle regular CSS imports (without ?inline) - return empty string for now
  if (specifier.endsWith(".css")) {
    const cssPath = specifier;
    const parentPath = context.parentURL
      ? fileURLToPath(context.parentURL)
      : process.cwd();
    const parentDir = dirname(parentPath);
    const resolvedPath = resolvePath(parentDir, cssPath);

    return {
      shortCircuit: true,
      url: `css-inline://${resolvedPath}`,
    };
  }

  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  // Handle our special css-inline:// URLs
  if (url.startsWith("css-inline://")) {
    try {
      const filePath = url.replace("css-inline://", "");
      const cssContent = readFileSync(filePath, "utf-8");
      // Return the CSS as a default export string
      return {
        format: "module",
        shortCircuit: true,
        source: `export default ${JSON.stringify(cssContent)};`,
      };
    } catch (error) {
      // If file doesn't exist or can't be read, return empty string
      return {
        format: "module",
        shortCircuit: true,
        source: `export default ${JSON.stringify("")};`,
      };
    }
  }

  return nextLoad(url, context);
}
