import type { Plugin } from "vite";
import * as path from "node:path";
import * as fs from "node:fs";
import { createSandboxApiMiddleware } from "./index.js";

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
 * 
 * Architecture:
 * - /sandbox/api/*  → Handled by API middleware (JSON responses)
 * - /sandbox/*      → SPA fallback to sandbox.html (React Router handles routing)
 */
export function sandboxPlugin(elementsRoot?: string): Plugin {
  return {
    name: "sandbox-routes",
    // Enable hot module replacement for sandbox-server files and sandbox story files
    handleHotUpdate({ file, server }) {
      // Watch sandbox-server code changes
      if (file.includes("sandbox-server")) {
        console.log(`[sandbox-plugin] 🔥 Hot reload: ${file}`);
        server.ws.send({ type: "full-reload" });
        return [];
      }
      
      // Watch sandbox story files (*.sandbox.ts)
      if (file.endsWith(".sandbox.ts") || file.endsWith(".sandbox.tsx")) {
        console.log(`[sandbox-plugin] 🔥 Hot reload: sandbox file changed: ${file}`);
        server.ws.send({ type: "full-reload" });
        return [];
      }
    },
    configureServer(server) {
      // Determine elements root
      let elementsPath: string;
      if (elementsRoot) {
        elementsPath = elementsRoot;
      } else {
        const packagesDir = path.dirname(server.config.root);
        const testPath = path.join(packagesDir, "packages", "elements", "src");
        
        if (fs.existsSync(testPath)) {
          elementsPath = packagesDir;
        } else {
          const monorepoRoot = findMonorepoRoot(server.config.root);
          if (monorepoRoot) {
            elementsPath = path.join(monorepoRoot, "elements");
          } else {
            elementsPath = server.config.root;
          }
        }
      }

      console.log(`[sandbox-plugin] ✅ Plugin loaded, elements root: ${elementsPath}`);
      
      // Test discovery asynchronously
      import("./discover.js").then(({ discoverSandboxes }) => {
        try {
          const sandboxes = discoverSandboxes(elementsPath);
          console.log(`[sandbox-plugin] Found ${sandboxes.length} sandboxes`);
        } catch (err) {
          console.error(`[sandbox-plugin] ⚠️  Failed to discover sandboxes:`, err);
        }
      }).catch(() => {});

      // Create API middleware (only handles /sandbox/api/* routes)
      const apiMiddleware = createSandboxApiMiddleware(elementsPath);
      
      // Middleware: Handle API routes, serve SPA for app routes
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || "";
        
        if (!url.startsWith("/sandbox")) {
          return next();
        }

        // API routes → handled by API middleware
        if (url.startsWith("/sandbox/api")) {
          console.log(`[sandbox-plugin] 📡 API route: ${url}`);
          (req as any).viteServer = server;
          await apiMiddleware(req, res, next);
          return;
        }

        // App routes → serve sandbox.html (SPA fallback)
        // React Router will handle /sandbox, /sandbox/:name, /sandbox/:name/:scenario
        console.log(`[sandbox-plugin] 📦 SPA route: ${url} → sandbox.html`);
        const sandboxHtmlPath = path.join(server.config.root, "sandbox.html");
        
        if (!fs.existsSync(sandboxHtmlPath)) {
          console.error(`[sandbox-plugin] ❌ sandbox.html not found at: ${sandboxHtmlPath}`);
          res.writeHead(500);
          res.end("sandbox.html not found");
          return;
        }

        // Let Vite transform and serve the HTML
        const htmlContent = fs.readFileSync(sandboxHtmlPath, "utf-8");
        const transformedHtml = await server.transformIndexHtml(url, htmlContent);
        
        res.setHeader("Content-Type", "text/html");
        res.writeHead(200);
        res.end(transformedHtml);
      });
      
      console.log(`[sandbox-plugin] ✅ Routes: /sandbox/api/* (API), /sandbox/* (SPA)`);
    },
  };
}
