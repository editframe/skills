import type { Plugin } from "vite";
import * as path from "node:path";
import * as fs from "node:fs";
import { createSandboxMiddleware } from "./index.js";

/**
 * Find monorepo root (directory containing elements/ and telecine/)
 */
function findMonorepoRoot(startDir: string): string | null {
  let current = startDir;
  while (current !== path.dirname(current)) {
    const elementsPath = path.join(current, "elements");
    const telecinePath = path.join(current, "telecine");
    if (fs.existsSync(elementsPath) && fs.existsSync(telecinePath)) {
      return current;
    }
    current = path.dirname(current);
  }
  return null;
}

/**
 * Vite plugin to add sandbox routes to the dev server
 */
export function sandboxPlugin(elementsRoot?: string): Plugin {
  return {
    name: "sandbox-routes",
    // Create virtual HTML files that Vite can serve
    resolveId(id) {
      if (id.startsWith("/_sandbox/") && id.endsWith(".html")) {
        return id; // Treat as virtual module
      }
      return null;
    },
    load(id) {
      // This won't be called for HTML files, but we'll handle HTML via middleware
      // that proxies to actual HTML files
      return null;
    },
    transformIndexHtml(html, ctx) {
      // This will be called for HTML files served by Vite
      // We'll create actual HTML files that Vite serves
      return html;
    },
    // Enable hot module replacement for sandbox-server files and sandbox story files
    handleHotUpdate({ file, server }) {
      // Watch sandbox-server code changes
      if (file.includes("sandbox-server")) {
        console.log(`[sandbox-plugin] 🔥 Hot reload: ${file}`);
        // Invalidate the module cache and trigger full reload
        server.ws.send({
          type: "full-reload",
        });
        return [];
      }
      
      // Watch sandbox story files (*.sandbox.ts)
      if (file.endsWith(".sandbox.ts") || file.endsWith(".sandbox.tsx")) {
        console.log(`[sandbox-plugin] 🔥 Hot reload: sandbox file changed: ${file}`);
        // Trigger full reload when sandbox files change
        server.ws.send({
          type: "full-reload",
        });
        return [];
      }
    },
    configureServer(server) {
      // Determine elements root
      let elementsPath: string;
      if (elementsRoot) {
        elementsPath = elementsRoot;
      } else {
        // In Docker, server.config.root is /packages/dev-projects
        // We need to go up to /packages (which is the elements root)
        const packagesDir = path.dirname(server.config.root);
        console.log(`[sandbox-plugin] server.config.root: ${server.config.root}`);
        console.log(`[sandbox-plugin] packagesDir: ${packagesDir}`);
        
        // In Docker: /packages is the elements root, sandboxes are at /packages/packages/elements/src/
        // Check if packagesDir is the elements root (has packages/elements/src)
        const testPath = path.join(packagesDir, "packages", "elements", "src");
        console.log(`[sandbox-plugin] Testing path: ${testPath}, exists: ${fs.existsSync(testPath)}`);
        
        if (fs.existsSync(testPath)) {
          elementsPath = packagesDir; // /packages is the elements root
          console.log(`[sandbox-plugin] ✅ Using elements root: ${elementsPath}`);
        } else {
          // Try to find monorepo root
          const monorepoRoot = findMonorepoRoot(server.config.root);
          if (monorepoRoot) {
            elementsPath = path.join(monorepoRoot, "elements");
            console.log(`[sandbox-plugin] Using monorepo root: ${elementsPath}`);
          } else {
            // Last fallback: assume we're in elements directory
            elementsPath = server.config.root;
            console.log(`[sandbox-plugin] ⚠️  Using fallback: ${elementsPath}`);
          }
        }
      }

      console.log(`[sandbox-plugin] ✅ Plugin loaded`);
      console.log(`[sandbox-plugin] Elements root: ${elementsPath}`);
      
      // Test discovery asynchronously to verify it works
      import("./discover.js").then(({ discoverSandboxes }) => {
        try {
          const sandboxes = discoverSandboxes(elementsPath);
          console.log(`[sandbox-plugin] Found ${sandboxes.length} sandboxes: ${sandboxes.map(s => s.elementName).join(", ")}`);
        } catch (err) {
          console.error(`[sandbox-plugin] ⚠️  Failed to discover sandboxes:`, err);
        }
      }).catch(() => {
        // Discovery will happen on first request
      });

      // Add sandbox middleware before Vite's default middleware
      // Note: We use a catch-all approach since Vite's middleware.use with a path
      // strips the prefix, which would break our path matching
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || "";
        
        // Only handle sandbox routes, let everything else pass through
        if (!url.startsWith("/_sandbox")) {
          return next();
        }

        try {
          // Pass Vite server root to the request so routes can create HTML files
          (req as any).viteServerRoot = server.config.root;
          const middleware = createSandboxMiddleware(elementsPath);
          await middleware(req, res, next);
        } catch (error) {
          console.error("[sandbox-plugin] ❌ Error in sandbox middleware:", error);
          if (!res.headersSent) {
            res.writeHead(500);
            res.end(`Sandbox error: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      });
      
      console.log(`[sandbox-plugin] ✅ Middleware registered for /_sandbox/* routes`);
    },
  };
}
