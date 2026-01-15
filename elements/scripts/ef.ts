#!/usr/bin/env npx tsx
/**
 * Element Sandbox CLI Tool
 * 
 * Usage:
 *   scripts/ef list                    # List all sandboxes
 *   scripts/ef open <name>             # Open sandbox in browser
 *   scripts/ef run [name] [options]    # Run scenarios as tests
 *   scripts/ef profile <name> [options] # Profile a scenario
 */

import { chromium, type Browser, type Page, type CDPSession } from "playwright";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { discoverSandboxes, loadSandbox } from "../sandbox-server/discover.js";
import type { Sandbox, ScenarioResult } from "../packages/elements/src/sandbox/index.js";
import { SandboxContext } from "../packages/elements/src/sandbox/SandboxContext.js";
import { render as litRender } from "lit";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function findMonorepoRoot(): string | null {
  let currentDir = __dirname;
  
  // In Docker, we might be in /packages (elements root) or /packages/scripts
  // Check if we're already in elements directory
  if (fs.existsSync(path.join(currentDir, "packages", "elements", "src"))) {
    // We're in elements root (/packages)
    // In Docker, monorepo root is / (one level up)
    // But .wsEndpoint.json is at the host monorepo root, which is mounted
    // Try / first, then traverse up
    if (fs.existsSync("/elements") && fs.existsSync("/telecine")) {
      return "/";
    }
    // Otherwise, go up from elements root
    return path.dirname(currentDir);
  }
  
  // Normal traversal
  while (currentDir !== path.dirname(currentDir)) {
    if (
      fs.existsSync(path.join(currentDir, "elements")) &&
      fs.existsSync(path.join(currentDir, "telecine"))
    ) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }
  return null;
}

function findElementsRoot(): string {
  // In Docker, we might already be in /packages (elements root)
  if (fs.existsSync(path.join(__dirname, "..", "packages", "elements", "src"))) {
    return path.resolve(__dirname, "..");
  }
  
  const monorepoRoot = findMonorepoRoot();
  if (!monorepoRoot) {
    throw new Error(`Could not find monorepo root. Started from: ${__dirname}`);
  }
  return path.join(monorepoRoot, "elements");
}

interface RunOptions {
  sandboxName?: string;
  scenarioPattern?: string;
  watch?: boolean;
  profile?: boolean;
  output?: string;
}

async function listSandboxes(): Promise<void> {
  const elementsRoot = findElementsRoot();
  const sandboxes = discoverSandboxes(elementsRoot);
  
  console.log("\n📦 Element Sandboxes:\n");
  if (sandboxes.length === 0) {
    console.log("  No sandboxes found");
    return;
  }
  
  for (const sandbox of sandboxes) {
    console.log(`  • ${sandbox.elementName}`);
  }
  console.log();
}

async function openSandbox(sandboxName: string): Promise<void> {
  const worktreeDomain = process.env.WORKTREE_DOMAIN || "main.localhost";
  const url = `http://${worktreeDomain}:4321/_sandbox/${sandboxName}`;
  console.log(`\n🌐 Opening ${url}\n`);
  
  // Try to open in default browser
  const { exec } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execAsync = promisify(exec);
  
  try {
    if (process.platform === "darwin") {
      await execAsync(`open "${url}"`);
    } else if (process.platform === "win32") {
      await execAsync(`start "${url}"`);
    } else {
      await execAsync(`xdg-open "${url}"`);
    }
  } catch (err) {
    console.log(`Please open ${url} in your browser`);
  }
}

async function runScenarios(options: RunOptions): Promise<number> {
  const elementsRoot = findElementsRoot();
  const sandboxes = discoverSandboxes(elementsRoot);
  
  let sandboxesToRun = sandboxes;
  if (options.sandboxName) {
    sandboxesToRun = sandboxes.filter((s) => s.elementName === options.sandboxName);
    if (sandboxesToRun.length === 0) {
      console.error(`\n❌ Sandbox "${options.sandboxName}" not found\n`);
      return 1;
    }
  }
  
  // Try to get wsEndpoint from environment variable first (set by scripts/run)
  // This is how browsertest script handles Docker - it reads the file on host and passes via env
  let browser: Browser;
  let shouldCloseBrowser = false;
  
  const wsEndpoint = process.env.WS_ENDPOINT;
  if (wsEndpoint) {
    try {
      console.log(`📡 Connecting to browser server: ${wsEndpoint}`);
      browser = await chromium.connect(wsEndpoint);
    } catch (err) {
      console.warn(`Failed to connect to browser server: ${err instanceof Error ? err.message : String(err)}`);
      console.log("🚀 Launching new browser...");
      browser = await chromium.launch({
        headless: true,
        channel: "chrome",
      });
      shouldCloseBrowser = true;
    }
  } else {
    // Try to find .wsEndpoint.json file
    const monorepoRoot = findMonorepoRoot();
    const possiblePaths = [
      monorepoRoot ? path.join(monorepoRoot, ".wsEndpoint.json") : null,
      path.join(elementsRoot, ".wsEndpoint.json"),
      "/.wsEndpoint.json", // Docker root mount
    ].filter((p): p is string => p !== null);
    
    let wsEndpointPath: string | null = null;
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        wsEndpointPath = possiblePath;
        break;
      }
    }
    
    if (wsEndpointPath) {
      try {
        const { wsEndpoint: endpoint } = JSON.parse(fs.readFileSync(wsEndpointPath, "utf-8"));
        console.log(`📡 Connecting to browser server: ${endpoint}`);
        browser = await chromium.connect(endpoint);
      } catch (err) {
        console.warn(`Failed to connect to browser server: ${err instanceof Error ? err.message : String(err)}`);
        console.log("🚀 Launching new browser...");
        browser = await chromium.launch({
          headless: true,
          channel: "chrome",
        });
        shouldCloseBrowser = true;
      }
    } else {
      console.log("🚀 Launching new browser (no .wsEndpoint.json found)...");
      browser = await chromium.launch({
        headless: true,
        channel: "chrome",
      });
      shouldCloseBrowser = true;
    }
  }
  
  let exitCode = 0;
  const context = await browser.newContext();
  
  try {
    for (const sandboxInfo of sandboxesToRun) {
      const results = await runSandboxScenarios(
        context,
        sandboxInfo,
        options,
        elementsRoot,
      );
      
      // Print results
      console.log(`\n${sandboxInfo.elementName}`);
      let passed = 0;
      let failed = 0;
      
      for (const result of results) {
        const icon = result.status === "passed" ? "✓" : "✗";
        const statusColor = result.status === "passed" ? "\x1b[32m" : "\x1b[31m";
        const resetColor = "\x1b[0m";
        console.log(
          `  ${statusColor}${icon}${resetColor} ${result.name} (${result.durationMs}ms)`,
        );
        
        if (result.status === "failed" || result.status === "error") {
          failed++;
          if (result.error) {
            console.log(`    Error: ${result.error.message}`);
            if (result.error.stack) {
              const stackLines = result.error.stack.split("\n").slice(0, 3);
              for (const line of stackLines) {
                console.log(`    ${line}`);
              }
            }
          }
        } else {
          passed++;
        }
      }
      
      console.log(`\n${passed} passed, ${failed} failed`);
      
      if (failed > 0) {
        exitCode = 1;
      }
    }
  } finally {
    await context.close();
    if (shouldCloseBrowser) {
      await browser.close();
    }
  }
  
  return exitCode;
}

async function runSandboxScenarios(
  browserContext: Awaited<ReturnType<typeof chromium.newContext>>,
  sandboxInfo: { filePath: string; elementName: string },
  options: RunOptions,
  elementsRoot: string,
): Promise<ScenarioResult[]> {
  const page = await browserContext.newPage();
  const results: ScenarioResult[] = [];
  
  try {
    // Load the sandbox module
    const config = (await loadSandbox(sandboxInfo.filePath)) as Sandbox;
    
    // Filter scenarios by pattern if provided
    let scenarioNames = Object.keys(config.scenarios);
    if (options.scenarioPattern) {
      const pattern = new RegExp(options.scenarioPattern.replace(/\*/g, ".*"));
      scenarioNames = scenarioNames.filter((name) => pattern.test(name));
    }
    
    if (scenarioNames.length === 0) {
      return results;
    }
    
    // Navigate to a page served by the dev server so modules can be loaded
    // Use the scenario-viewer page which has all the necessary setup
    const worktreeDomain = process.env.WORKTREE_DOMAIN || "main.localhost";
    const devServerUrl = `http://${worktreeDomain}:4321`;
    
    // Navigate to the scenario-viewer page
    await page.goto(`${devServerUrl}/scenario-viewer.html?sandbox=${sandboxInfo.elementName}`, {
      waitUntil: "networkidle",
    });
    
    // Wait for the sandbox to load and SandboxContext to be available
    await page.waitForFunction(() => {
      return document.getElementById("sandbox-container") !== null;
    }, { timeout: 10000 });
    
    // Inject sandbox code and run scenarios
    for (const scenarioName of scenarioNames) {
      const scenario = config.scenarios[scenarioName];
      if (!scenario) continue;
      
      const startTime = Date.now();
      let result: ScenarioResult;
      
      try {
        // Run scenario directly in the browser by importing the sandbox module
        // and executing the scenario function
        await page.evaluate(
          async ({ scenarioName, sandboxName }) => {
            // Import the sandbox module to get the scenario function
            const response = await fetch(`/_sandbox/api/${sandboxName}/config`);
            const data = await response.json();
            
            // Import the sandbox module
            let importPath = data.filePath;
            if (importPath.startsWith("@editframe/elements/")) {
              const relativePath = importPath.replace("@editframe/elements/", "");
              importPath = `/packages/packages/elements/src/${relativePath}`;
            }
            
            const module = await import(importPath);
            const config = module.default || module;
            const scenario = config.scenarios[scenarioName];
            
            if (!scenario) {
              throw new Error(`Scenario "${scenarioName}" not found`);
            }
            
            // Import SandboxContext using the actual file path
            // Vite can resolve this from the scenario-viewer page context
            const { SandboxContext } = await import(
              "/packages/packages/elements/src/sandbox/SandboxContext.js"
            );
            
            const container = document.getElementById("sandbox-container");
            if (!container) throw new Error("Container not found");
            
            const ctx = new SandboxContext(container as HTMLElement);
            
            // Execute the scenario function
            await scenario(ctx);
          },
          {
            scenarioName,
            sandboxName: sandboxInfo.elementName,
          },
        );
        
        const durationMs = Date.now() - startTime;
        result = {
          name: scenarioName,
          status: "passed",
          durationMs,
        };
      } catch (err) {
        const durationMs = Date.now() - startTime;
        const error = err instanceof Error ? err : new Error(String(err));
        result = {
          name: scenarioName,
          status: "error",
          durationMs,
          error: {
            message: error.message,
            stack: error.stack,
          },
        };
      }
      
      results.push(result);
    }
  } finally {
    await page.close();
  }
  
  return results;
}

async function profileScenario(
  sandboxName: string,
  scenarioName: string,
  outputPath: string,
): Promise<void> {
  console.log(`\n🔬 Profiling ${sandboxName}::${scenarioName}\n`);
  // Implementation similar to profile-playback.ts
  // This would use CDP Profiler API
  console.log("Profiling not yet implemented");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];
  
  // Handle help flag
  if (command === "--help" || command === "-h" || command === "help") {
    console.log(`
Element Sandbox CLI Tool

Usage:
  scripts/ef <command> [options]

Commands:
  list                          List all sandboxes
  open <name>                   Open sandbox in browser
  run [name] [options]          Run scenarios as tests
  profile <name> [options]      Profile a scenario

Options:
  --scenario <pattern>          Run scenarios matching pattern (supports * wildcard)
  --watch                       Watch mode - re-run on file changes
  --output <path>               Output path for profile (default: ./profile.cpuprofile)

Examples:
  scripts/ef list
  scripts/ef open EFDial
  scripts/ef run EFDial
  scripts/ef run EFDial --scenario "normalizes*"
  scripts/ef run                # Run all sandboxes (CI mode)
  scripts/ef profile EFDial --scenario "rotates through full circle"
`);
    process.exit(0);
  }
  
  if (command === "list" || !command) {
    await listSandboxes();
    process.exit(0);
  }
  
  if (command === "open") {
    const sandboxName = args[1];
    if (!sandboxName) {
      console.error("Usage: scripts/ef open <sandbox-name>");
      console.error("Run 'scripts/ef --help' for more information");
      process.exit(1);
    }
    await openSandbox(sandboxName);
    process.exit(0);
  }
  
  if (command === "run") {
    const options: RunOptions = {};
    let i = 1;
    while (i < args.length) {
      if (args[i] === "--scenario" && args[i + 1]) {
        options.scenarioPattern = args[i + 1];
        i += 2;
      } else if (args[i] === "--watch") {
        options.watch = true;
        i++;
      } else if (!options.sandboxName && !args[i].startsWith("--")) {
        options.sandboxName = args[i];
        i++;
      } else {
        i++;
      }
    }
    
    const exitCode = await runScenarios(options);
    process.exit(exitCode);
  }
  
  if (command === "profile") {
    const sandboxName = args[1];
    const scenarioName = args.find((a) => a.startsWith("--scenario"))?.split("=")[1] || args[3];
    const outputPath =
      args.find((a) => a.startsWith("--output"))?.split("=")[1] || "./profile.cpuprofile";
    
    if (!sandboxName || !scenarioName) {
      console.error("Usage: scripts/ef profile <sandbox-name> --scenario <scenario-name> [--output <path>]");
      process.exit(1);
    }
    
    await profileScenario(sandboxName, scenarioName, outputPath);
    process.exit(0);
  }
  
  console.error(`Unknown command: ${command}`);
  console.error("Usage: scripts/ef [list|open|run|profile]");
  process.exit(1);
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
