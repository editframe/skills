import { chromium, type Browser } from "playwright";
import * as fs from "node:fs";
import * as path from "node:path";
import { discoverSandboxes } from "../sandbox-server/discover.js";
import { findElementsRoot, findMonorepoRoot } from "./ef-utils/paths.js";
import { connectToBrowser } from "./ef-utils/browser.js";
import type { ScreenshotOptions } from "./ef-utils/types.js";

export async function screenshotSandbox(options: ScreenshotOptions): Promise<void> {
  const elementsRoot = findElementsRoot();
  const sandboxes = discoverSandboxes(elementsRoot);
  const sandbox = sandboxes.find((s) => s.elementName === options.sandboxName);
  
  if (!sandbox) {
    console.error(`\n❌ Sandbox "${options.sandboxName}" not found\n`);
    process.exit(1);
  }
  
  // Get browser connection
  const { browser, shouldClose: shouldCloseBrowser } = await connectToBrowser();
  
  const context = await browser.newContext({
    viewport: options.width && options.height 
      ? { width: options.width, height: options.height }
      : null,
  });
  const page = await context.newPage();
  
  try {
    // Navigate to scenario-runner.html
    const worktreeDomain = process.env.WORKTREE_DOMAIN || "main.localhost";
    const devServerUrl = `http://${worktreeDomain}:4321`;
    
    await page.goto(`${devServerUrl}/scenario-runner.html?sandbox=${sandbox.elementName}`, {
      waitUntil: "load",
      timeout: 30000,
    });
    
    // Wait for container to exist
    await page.waitForFunction(() => {
      return document.getElementById("sandbox-container") !== null;
    }, { timeout: 5000 });
    
    // Wait for track components to load
    await page.waitForFunction(() => {
      return (window as any).__trackComponentsLoaded || (window as any).__trackComponentsLoadError;
    }, { timeout: 10000 }).catch(() => {});
    
    const preloadStatus = await page.evaluate(() => {
      return {
        loaded: (window as any).__trackComponentsLoaded,
        error: (window as any).__trackComponentsLoadError,
      };
    });
    
    if (preloadStatus.error) {
      throw new Error(`Track components preload failed: ${preloadStatus.error}`);
    }
    
    // Load the sandbox config and store it
    await page.evaluate(async ({ sandboxName }) => {
      const loadSandbox = (window as any).__loadSandbox;
      if (!loadSandbox) {
        throw new Error("__loadSandbox not available");
      }
      
      const config = await loadSandbox(sandboxName);
      (window as any).__sandboxConfig = config;
    }, { sandboxName: sandbox.elementName });
    
    // If a scenario is specified, run it first
    if (options.scenarioName) {
      const scenarioExists = await page.evaluate(({ scenarioName }) => {
        const config = (window as any).__sandboxConfig;
        return config && config.scenarios && scenarioName in config.scenarios;
      }, { scenarioName: options.scenarioName });
      
      if (!scenarioExists) {
        throw new Error(`Scenario "${options.scenarioName}" not found in sandbox "${sandbox.elementName}"`);
      }
      
      // Run the scenario
      const scenarioResult = await page.evaluate(async ({ scenarioName }) => {
        const runScenario = (window as any).__runScenario;
        if (!runScenario) {
          throw new Error("__runScenario not available");
        }
        
        const config = (window as any).__sandboxConfig;
        const container = document.getElementById("sandbox-container");
        if (!container) {
          throw new Error("sandbox-container not found");
        }
        
        const result = await runScenario(config, scenarioName, container);
        return result;
      }, { scenarioName: options.scenarioName });
      
      if (scenarioResult && (scenarioResult.status === "failed" || scenarioResult.status === "error")) {
        const errorMsg = scenarioResult.error?.message || "Scenario failed";
        throw new Error(`Scenario "${options.scenarioName}" failed: ${errorMsg}`);
      }
      
      // Wait for scenario to complete and DOM to settle
      await page.waitForTimeout(500);
      await page.waitForLoadState("networkidle").catch(() => {});
    } else {
      // Render the default template
      await page.evaluate(async () => {
        const litRender = (window as any).__litRender;
        if (!litRender) {
          throw new Error("__litRender not available");
        }
        
        const config = (window as any).__sandboxConfig;
        const container = document.getElementById("sandbox-container");
        if (!container) {
          throw new Error("sandbox-container not found");
        }
        
        // Render the template
        const templateResult = config.render();
        litRender(templateResult, container);
        
        // Run setup if provided
        if (config.setup) {
          await config.setup(container);
        }
      });
      
      // Wait for rendering to complete
      await page.waitForTimeout(500);
      await page.waitForLoadState("networkidle").catch(() => {});
    }
    
    // Generate output path
    let outputPath = options.outputPath;
    if (!outputPath) {
      const screenshotsDir = path.join(elementsRoot, ".ef-screenshots");
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
      const scenarioSuffix = options.scenarioName 
        ? `-${options.scenarioName.replace(/[^a-zA-Z0-9]/g, "_")}`
        : "";
      const filename = `${sandbox.elementName}${scenarioSuffix}-${timestamp}.png`;
      outputPath = path.join(screenshotsDir, filename);
    }
    
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Take screenshot of the container element
    const container = page.locator("#sandbox-container");
    await container.screenshot({ path: outputPath });
    
    console.log(`\n✅ Screenshot saved: ${outputPath}\n`);
  } finally {
    await page.close();
    await context.close();
    if (shouldCloseBrowser) {
      await browser.close();
    }
  }
}
