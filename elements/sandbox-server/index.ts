import * as http from "node:http";
import * as path from "node:path";
import * as url from "node:url";
import { fileURLToPath } from "node:url";
import {
  handleList,
  handleRelationships,
  handleRunScenario,
  handleScenarios,
} from "./routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Find monorepo root (directory containing elements/ and telecine/)
 */
function findMonorepoRoot(startDir: string): string | null {
  let current = startDir;
  const fs = require("node:fs");
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
 * Create middleware for sandbox API routes only (/sandbox/api/*)
 * App routes (/sandbox/*) are handled by SPA fallback in vite-plugin.ts
 */
export function createSandboxApiMiddleware(elementsRoot: string) {
  return async (
    req: http.IncomingMessage,
    res: http.ServerResponse,
    next?: () => void,
  ): Promise<void> => {
    const parsedUrl = url.parse(req.url || "", true);
    const pathname = parsedUrl.pathname || "";

    // Only handle API routes
    if (!pathname.startsWith("/sandbox/api")) {
      if (next) next();
      return;
    }

    // /sandbox/api/list
    if (pathname === "/sandbox/api/list") {
      await handleList(req, res, elementsRoot);
      return;
    }

    // /sandbox/api/relationships
    if (pathname === "/sandbox/api/relationships") {
      await handleRelationships(req, res, elementsRoot);
      return;
    }

    // /sandbox/api/:name/config
    const configMatch = pathname.match(/^\/sandbox\/api\/([^/]+)\/config$/);
    if (configMatch) {
      const { handleSandboxConfig } = await import("./routes.js");
      await handleSandboxConfig(req, res, elementsRoot, configMatch[1]);
      return;
    }

    // /sandbox/api/:name/scenarios
    const scenariosMatch = pathname.match(/^\/sandbox\/api\/([^/]+)\/scenarios$/);
    if (scenariosMatch) {
      await handleScenarios(req, res, elementsRoot, scenariosMatch[1]);
      return;
    }

    // /sandbox/api/:name/run/:scenario
    const runMatch = pathname.match(/^\/sandbox\/api\/([^/]+)\/run\/(.+)$/);
    if (runMatch) {
      await handleRunScenario(req, res, elementsRoot, runMatch[1], runMatch[2]);
      return;
    }

    // Unknown API route
    res.setHeader("Content-Type", "application/json");
    res.writeHead(404);
    res.end(JSON.stringify({ error: `Unknown API route: ${pathname}` }));
  };
}

/**
 * Standalone HTTP server for sandbox API (for testing)
 * Note: This only serves API routes. For full sandbox app, use the Vite dev server.
 */
export function createSandboxApiServer(port: number = 4322, elementsRoot?: string): http.Server {
  const root = elementsRoot || findMonorepoRoot(__dirname) || process.cwd();
  const elementsPath = path.join(root, "elements");

  const server = http.createServer(async (req, res) => {
    const middleware = createSandboxApiMiddleware(elementsPath);
    await middleware(req, res, () => {
      res.setHeader("Content-Type", "application/json");
      res.writeHead(404);
      res.end(JSON.stringify({ error: "Not found" }));
    });
  });

  server.listen(port, () => {
    console.log(`Sandbox API server listening on port ${port}`);
  });

  return server;
}

// If run directly, start the API server
if (import.meta.url === url.pathToFileURL(process.argv[1] || "").href) {
  const port = parseInt(process.env.PORT || "4322", 10);
  createSandboxApiServer(port);
}
