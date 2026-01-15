import type { IncomingMessage, ServerResponse } from "node:http";
import * as fs from "node:fs";
import * as path from "node:path";
import { discoverSandboxes, loadSandbox } from "./discover.js";
import type { Sandbox, ScenarioResult } from "../packages/elements/src/sandbox/index.js";

/**
 * Get all discovered sandboxes
 */
export function getSandboxes(elementsRoot: string): Array<{ name: string; filePath: string; elementName: string }> {
  const discovered = discoverSandboxes(elementsRoot);
  return discovered.map((s) => ({
    name: s.elementName,
    filePath: s.filePath,
    elementName: s.elementName,
  }));
}

/**
 * Handle /_sandbox/api/list route
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
 * Handle /_sandbox/api/:name/scenarios route
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
    res.writeHead(404);
    res.end(JSON.stringify({ error: `Sandbox "${sandboxName}" not found` }));
    return;
  }

  try {
    const config = await loadSandbox(sandbox.filePath) as Sandbox;
    const scenarioNames = Object.keys(config.scenarios || {});
    res.setHeader("Content-Type", "application/json");
    res.writeHead(200);
    res.end(JSON.stringify({ scenarios: scenarioNames }));
  } catch (error) {
    res.writeHead(500);
    res.end(
      JSON.stringify({
        error: `Failed to load sandbox: ${error instanceof Error ? error.message : String(error)}`,
      }),
    );
  }
}

/**
 * Handle /_sandbox/api/:name/config route - get sandbox config
 */
export async function handleSandboxConfig(
  req: IncomingMessage,
  res: ServerResponse,
  elementsRoot: string,
  sandboxName: string,
): Promise<void> {
  const sandboxes = getSandboxes(elementsRoot);
  const sandbox = sandboxes.find((s) => s.name === sandboxName);

  if (!sandbox) {
    res.writeHead(404);
    res.end(JSON.stringify({ error: `Sandbox "${sandboxName}" not found` }));
    return;
  }

  try {
    const config = await loadSandbox(sandbox.filePath) as Sandbox;
    
    // Convert absolute file path to a path that Vite can resolve
    // In Docker: elementsRoot is /packages, sandbox.filePath is /packages/packages/elements/src/gui/EFDial.sandbox.ts
    // Use the alias @editframe/elements which maps to /packages/packages/elements/src
    const relativeToElementsSrc = path.relative(
      path.join(elementsRoot, "packages", "elements", "src"),
      sandbox.filePath
    );
    const modulePath = `@editframe/elements/${relativeToElementsSrc.replace(/\\/g, "/")}`;
    
    res.setHeader("Content-Type", "application/json");
    res.writeHead(200);
    res.end(JSON.stringify({ 
      config: {
        name: config.name,
        description: config.description,
        scenarios: Object.keys(config.scenarios || {}),
      },
      filePath: modulePath,
      absolutePath: sandbox.filePath,
    }));
  } catch (error) {
    res.writeHead(500);
    res.end(
      JSON.stringify({
        error: `Failed to load sandbox: ${error instanceof Error ? error.message : String(error)}`,
      }),
    );
  }
}

/**
 * Handle /_sandbox/api/:name/run/:scenario route
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
    res.writeHead(404);
    res.end(JSON.stringify({ error: `Sandbox "${sandboxName}" not found` }));
    return;
  }

  try {
    const config = await loadSandbox(sandbox.filePath) as Sandbox;
    const scenario = config.scenarios?.[scenarioName];

    if (!scenario) {
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
    res.writeHead(500);
    res.end(
      JSON.stringify({
        error: `Failed to run scenario: ${error instanceof Error ? error.message : String(error)}`,
      }),
    );
  }
}

/**
 * Handle /_sandbox/:name route - serve sandbox viewer HTML
 */
export function handleSandboxViewer(
  req: IncomingMessage,
  res: ServerResponse,
  elementsRoot: string,
  sandboxName: string,
): void {
  const sandboxes = getSandboxes(elementsRoot);
  const sandbox = sandboxes.find((s) => s.name === sandboxName);

  if (!sandbox) {
    res.writeHead(404);
    res.end(`Sandbox "${sandboxName}" not found`);
    return;
  }

  // Redirect to the scenario-viewer.html with the sandbox name as a query parameter
  // This uses the static React app in dev-projects
  res.writeHead(302, { Location: `/scenario-viewer.html?sandbox=${encodeURIComponent(sandboxName)}` });
  res.end();
}


/**
 * Handle /_sandbox/ route - serve index page
 */
export function handleIndex(
  req: IncomingMessage,
  res: ServerResponse,
  elementsRoot: string,
): void {
  const sandboxes = getSandboxes(elementsRoot);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Element Sandboxes</title>
  <style>
    body {
      margin: 0;
      padding: 20px;
      font-family: system-ui, -apple-system, sans-serif;
      background: #f5f5f5;
    }
    h1 {
      margin-top: 0;
    }
    .sandbox-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
      margin-top: 20px;
    }
    .sandbox-card {
      background: white;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      text-decoration: none;
      color: inherit;
      display: block;
    }
    .sandbox-card:hover {
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .sandbox-name {
      font-weight: 600;
      margin-bottom: 4px;
    }
  </style>
</head>
<body>
  <h1>Element Sandboxes</h1>
  <div class="sandbox-list">
    ${sandboxes
      .map(
        (s) => `
      <a href="/_sandbox/${s.name}" class="sandbox-card">
        <div class="sandbox-name">${s.name}</div>
      </a>
    `,
      )
      .join("")}
  </div>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html");
  res.writeHead(200);
  res.end(html);
}
