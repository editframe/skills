import type { IncomingMessage, ServerResponse } from "node:http";
import * as fs from "node:fs";
import * as path from "node:path";
import { discoverSandboxes, loadSandbox, buildSandboxGraph } from "./discover.js";
import type { Sandbox, ScenarioResult } from "../packages/elements/src/sandbox/index.js";

// NOTE: ProfileService and HTTP-based profile routes have been removed.
// Profiling is now done via exposed functions injected by `ef open`.
// See: elements/scripts/ef.ts for __startProfiling/__stopProfiling functions.

/**
 * Get all discovered sandboxes
 */
export function getSandboxes(elementsRoot: string): Array<{ name: string; filePath: string; elementName: string; category: string | null }> {
  const discovered = discoverSandboxes(elementsRoot);
  return discovered.map((s) => ({
    name: s.elementName,
    filePath: s.filePath,
    elementName: s.elementName,
    category: s.category,
  }));
}

/**
 * Handle /sandbox/api/list route
 */
export async function handleList(
  req: IncomingMessage,
  res: ServerResponse,
  elementsRoot: string,
): Promise<void> {
  const sandboxes = getSandboxes(elementsRoot);
  res.setHeader("Content-Type", "application/json");
  res.writeHead(200);
  res.end(JSON.stringify({ sandboxes }));
}

/**
 * Handle /sandbox/api/relationships route
 * Returns the relationship graph for all sandboxes
 */
export async function handleRelationships(
  req: IncomingMessage,
  res: ServerResponse,
  elementsRoot: string,
): Promise<void> {
  const { relationships } = buildSandboxGraph(elementsRoot);
  res.setHeader("Content-Type", "application/json");
  res.writeHead(200);
  res.end(JSON.stringify({ relationships }));
}

/**
 * Handle /sandbox/api/:name/scenarios route
 */
export async function handleScenarios(
  req: IncomingMessage,
  res: ServerResponse,
  elementsRoot: string,
  sandboxName: string,
): Promise<void> {
  const sandboxes = getSandboxes(elementsRoot);
  const sandbox = sandboxes.find((s) => s.name === sandboxName);

  if (!sandbox) {
    res.setHeader("Content-Type", "application/json");
    res.writeHead(404);
    res.end(JSON.stringify({ error: `Sandbox "${sandboxName}" not found` }));
    return;
  }

  try {
    // Use Vite's ssrLoadModule if available (in Vite dev server context)
    const viteServer = (req as any).viteServer;
    let config: Sandbox;
    
    if (viteServer) {
      // Convert absolute path to a URL that Vite can resolve
      const elementsSrcPath = path.join(elementsRoot, "packages", "elements", "src");
      const relativeToElementsSrc = path.relative(elementsSrcPath, sandbox.filePath);
      const normalizedPath = relativeToElementsSrc.replace(/\\/g, "/");
      const modulePath = `@editframe/elements/${normalizedPath}`;
      
      // Use Vite's SSR module loading to handle TypeScript
      const module = await viteServer.ssrLoadModule(modulePath);
      config = (module.default || module) as Sandbox;
    } else {
      // Fallback to direct import (requires tsx or compiled JS)
      config = await loadSandbox(sandbox.filePath) as Sandbox;
    }
    
    const scenarioNames = Object.keys(config.scenarios || {});
    res.setHeader("Content-Type", "application/json");
    res.writeHead(200);
    res.end(JSON.stringify({ scenarios: scenarioNames }));
  } catch (error) {
    res.setHeader("Content-Type", "application/json");
    res.writeHead(500);
    res.end(
      JSON.stringify({
        error: `Failed to load sandbox: ${error instanceof Error ? error.message : String(error)}`,
      }),
    );
  }
}

/**
 * Handle /sandbox/api/:name/config route - get sandbox config
 */
export async function handleSandboxConfig(
  req: IncomingMessage,
  res: ServerResponse,
  elementsRoot: string,
  sandboxName: string,
): Promise<void> {
  console.log(`[sandbox-routes] 📋 handleSandboxConfig called for: ${sandboxName}`);
  const sandboxes = getSandboxes(elementsRoot);
  const sandbox = sandboxes.find((s) => s.name === sandboxName);

  if (!sandbox) {
    console.log(`[sandbox-routes] ❌ Sandbox "${sandboxName}" not found. Available: ${sandboxes.map(s => s.name).join(", ")}`);
    res.setHeader("Content-Type", "application/json");
    res.writeHead(404);
    res.end(JSON.stringify({ error: `Sandbox "${sandboxName}" not found` }));
    return;
  }

  console.log(`[sandbox-routes] ✅ Found sandbox: ${sandboxName} at ${sandbox.filePath}`);

  try {
    // Convert absolute file path to @editframe/elements/... format
    // This matches what the sandbox-loader expects (it builds paths from import.meta.glob)
    const elementsSrcPath = path.join(elementsRoot, "packages", "elements", "src");
    const relativeToElementsSrc = path.relative(elementsSrcPath, sandbox.filePath);
    const normalizedPath = relativeToElementsSrc.replace(/\\/g, "/");
    const modulePath = `@editframe/elements/${normalizedPath}`;
    
    console.log(`[sandbox-routes] ✅ Returning config path: ${modulePath}`);
    console.log(`[sandbox-routes]   elementsRoot: ${elementsRoot}`);
    console.log(`[sandbox-routes]   sandbox.filePath: ${sandbox.filePath}`);
    
    // Don't load the module server-side - it contains browser-only code (custom elements)
    // Just return the path so the browser can load it
    res.setHeader("Content-Type", "application/json");
    res.writeHead(200);
    res.end(JSON.stringify({ 
      filePath: modulePath,
      absolutePath: sandbox.filePath,
    }));
  } catch (error) {
    console.error(`[sandbox-routes] ❌ Error loading sandbox config for ${sandboxName}:`, error);
    if (error instanceof Error) {
      console.error(`[sandbox-routes] Error stack:`, error.stack);
    }
    res.setHeader("Content-Type", "application/json");
    res.writeHead(500);
    res.end(
      JSON.stringify({
        error: `Failed to load sandbox: ${error instanceof Error ? error.message : String(error)}`,
        details: error instanceof Error ? error.stack : String(error),
      }),
    );
  }
}

/**
 * Handle /sandbox/api/:name/run/:scenario route
 */
export async function handleRunScenario(
  req: IncomingMessage,
  res: ServerResponse,
  elementsRoot: string,
  sandboxName: string,
  scenarioName: string,
): Promise<void> {
  const sandboxes = getSandboxes(elementsRoot);
  const sandbox = sandboxes.find((s) => s.name === sandboxName);

  if (!sandbox) {
    res.setHeader("Content-Type", "application/json");
    res.writeHead(404);
    res.end(JSON.stringify({ error: `Sandbox "${sandboxName}" not found` }));
    return;
  }

  try {
    // Use Vite's ssrLoadModule if available (in Vite dev server context)
    const viteServer = (req as any).viteServer;
    let config: Sandbox;
    
    if (viteServer) {
      // Convert absolute path to a URL that Vite can resolve
      const elementsSrcPath = path.join(elementsRoot, "packages", "elements", "src");
      const relativeToElementsSrc = path.relative(elementsSrcPath, sandbox.filePath);
      const normalizedPath = relativeToElementsSrc.replace(/\\/g, "/");
      const modulePath = `@editframe/elements/${normalizedPath}`;
      
      // Use Vite's SSR module loading to handle TypeScript
      const module = await viteServer.ssrLoadModule(modulePath);
      config = (module.default || module) as Sandbox;
    } else {
      // Fallback to direct import (requires tsx or compiled JS)
      config = await loadSandbox(sandbox.filePath) as Sandbox;
    }
    
    const scenario = config.scenarios?.[scenarioName];

    if (!scenario) {
      res.setHeader("Content-Type", "application/json");
      res.writeHead(404);
      res.end(JSON.stringify({ error: `Scenario "${scenarioName}" not found` }));
      return;
    }

    // Note: Actual scenario execution happens in the browser via SandboxViewer
    // This endpoint just validates that the scenario exists
    res.setHeader("Content-Type", "application/json");
    res.writeHead(200);
    res.end(JSON.stringify({ success: true }));
  } catch (error) {
    res.setHeader("Content-Type", "application/json");
    res.writeHead(500);
    res.end(
      JSON.stringify({
        error: `Failed to run scenario: ${error instanceof Error ? error.message : String(error)}`,
      }),
    );
  }
}

// NOTE: App routes (/sandbox/*) are now served via SPA fallback in vite-plugin.ts
// See: elements/dev-projects/sandbox.html
// Profiling is now done via exposed functions injected by `ef open`.
// See: elements/scripts/ef.ts for __startProfiling/__stopProfiling functions.
