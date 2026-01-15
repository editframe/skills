import * as http from "node:http";
import * as path from "node:path";
import * as url from "node:url";
import { fileURLToPath } from "node:url";
import {
  handleIndex,
  handleList,
  handleRunScenario,
  handleSandboxViewer,
  handleScenarios,
} from "./routes.js";

// NOTE: Profile routes (/_sandbox/api/profile/*) have been removed.
// Profiling is now done via exposed functions injected by `ef open`.
// See: elements/scripts/ef.ts for __startProfiling/__stopProfiling functions.

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
 * Create middleware function for sandbox routes
 * This can be integrated into an existing HTTP server
 */
export function createSandboxMiddleware(elementsRoot: string) {
  return async (
    req: http.IncomingMessage,
    res: http.ServerResponse,
    next?: () => void,
  ): Promise<void> => {
    const parsedUrl = url.parse(req.url || "", true);
    const pathname = parsedUrl.pathname || "";
    const method = req.method || "GET";

    // Handle sandbox routes
    if (pathname.startsWith("/_sandbox")) {
      console.log(`[sandbox-middleware] 🔍 Matching route: ${method} ${pathname}`);
      
      if (pathname === "/_sandbox/" || pathname === "/_sandbox") {
        console.log(`[sandbox-middleware] ✅ Matched: index`);
        await handleIndex(req, res, elementsRoot);
        return;
      }

      if (pathname === "/_sandbox/api/list") {
        console.log(`[sandbox-middleware] ✅ Matched: list`);
        await handleList(req, res, elementsRoot);
        return;
      }

      // Match /_sandbox/api/:name/config
      const configMatch = pathname.match(/^\/_sandbox\/api\/([^/]+)\/config$/);
      if (configMatch) {
        const { handleSandboxConfig } = await import("./routes.js");
        await handleSandboxConfig(req, res, elementsRoot, configMatch[1]);
        return;
      }

      // Match /_sandbox/api/:name/scenarios
      const scenariosMatch = pathname.match(/^\/_sandbox\/api\/([^/]+)\/scenarios$/);
      if (scenariosMatch) {
        await handleScenarios(req, res, elementsRoot, scenariosMatch[1]);
        return;
      }

      // Match /_sandbox/api/:name/run/:scenario
      const runMatch = pathname.match(/^\/_sandbox\/api\/([^/]+)\/run\/(.+)$/);
      if (runMatch) {
        await handleRunScenario(req, res, elementsRoot, runMatch[1], runMatch[2]);
        return;
      }

      // Match /_sandbox/:name - redirect to scenario-viewer.html
      const viewerMatch = pathname.match(/^\/_sandbox\/([^/]+)$/);
      if (viewerMatch) {
        console.log(`[sandbox-middleware] ✅ Matched: viewer for ${viewerMatch[1]}`);
        handleSandboxViewer(req, res, elementsRoot, viewerMatch[1]);
        return;
      }
      
      // If we got here, the path starts with /_sandbox but didn't match any route
      console.warn(`[sandbox-middleware] ⚠️  Unmatched sandbox route: ${method} ${pathname}`);
      if (!res.headersSent) {
        res.setHeader("Content-Type", "application/json");
        res.writeHead(404);
        res.end(JSON.stringify({ error: `Sandbox route not found: ${pathname}` }));
      }
      return;
    }

    // If no sandbox route matched, call next middleware
    if (next) {
      next();
    }
  };
}

/**
 * Standalone HTTP server for sandboxes (for testing)
 */
export function createSandboxServer(port: number = 4321, elementsRoot?: string): http.Server {
  const root = elementsRoot || findMonorepoRoot(__dirname) || process.cwd();
  const elementsPath = path.join(root, "elements");

  const server = http.createServer(async (req, res) => {
    const middleware = createSandboxMiddleware(elementsPath);
    await middleware(req, res, () => {
      res.setHeader("Content-Type", "application/json");
      res.writeHead(404);
      res.end(JSON.stringify({ error: "Not found" }));
    });
  });

  server.listen(port, () => {
    console.log(`Sandbox server listening on port ${port}`);
  });

  return server;
}

// If run directly, start the server
if (import.meta.url === url.pathToFileURL(process.argv[1] || "").href) {
  const port = parseInt(process.env.PORT || "4321", 10);
  createSandboxServer(port);
}
