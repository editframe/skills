import { chromium, type Browser } from "playwright";
import * as fs from "node:fs";
import * as path from "node:path";
import { findMonorepoRoot } from "./paths.js";
import { findElementsRoot } from "./paths.js";

export async function connectToBrowser(options?: { forceLaunch?: boolean }): Promise<{ browser: Browser; shouldClose: boolean }> {
  const forceLaunch = options?.forceLaunch ?? false;
  
  // If forceLaunch is true, connect to host browser server (which is headless)
  // ef run runs in containers and should use the host browser server
  if (forceLaunch) {
    const elementsRoot = findElementsRoot();
    
    // Try to get wsEndpoint from environment variable first
    const wsEndpoint = process.env.WS_ENDPOINT;
    if (wsEndpoint) {
      try {
        console.log(`📡 Connecting to browser server: ${wsEndpoint}`);
        const browser = await chromium.connect(wsEndpoint);
        return { browser, shouldClose: false };
      } catch (err) {
        throw new Error(
          `Failed to connect to browser server: ${err instanceof Error ? err.message : String(err)}. ` +
          "Ensure host browser server is running (scripts/start-host-chrome)."
        );
      }
    }
    
    // Try to find .wsEndpoint.json file
    const monorepoRoot = findMonorepoRoot();
    const possiblePaths = [
      monorepoRoot ? path.join(monorepoRoot, ".wsEndpoint.json") : null,
      path.join(elementsRoot, ".wsEndpoint.json"),
      "/.wsEndpoint.json", // Docker root mount
    ].filter((p): p is string => p !== null);
    
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        try {
          const { wsEndpoint: endpoint } = JSON.parse(fs.readFileSync(possiblePath, "utf-8"));
          console.log(`📡 Connecting to browser server: ${endpoint}`);
          const browser = await chromium.connect(endpoint);
          return { browser, shouldClose: false };
        } catch (err) {
          // Continue to next path
        }
      }
    }
    
    throw new Error(
      "Cannot find browser server endpoint. " +
      "Ensure WS_ENDPOINT environment variable is set or .wsEndpoint.json file exists. " +
      "Start host browser server with: scripts/start-host-chrome"
    );
  }
  
  // Normal connection flow (for ef open, etc.) - try to connect first, then launch
  const elementsRoot = findElementsRoot();
  
  // Try to get wsEndpoint from environment variable first
  const wsEndpoint = process.env.WS_ENDPOINT;
  if (wsEndpoint) {
    try {
      console.log(`📡 Connecting to browser server: ${wsEndpoint}`);
      const browser = await chromium.connect(wsEndpoint);
      return { browser, shouldClose: false };
    } catch (err) {
      console.warn(`Failed to connect to browser server: ${err instanceof Error ? err.message : String(err)}`);
      // Fall through to try file-based connection or launch
    }
  }
  
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
      const browser = await chromium.connect(endpoint);
      return { browser, shouldClose: false };
    } catch (err) {
      console.warn(`Failed to connect to browser server: ${err instanceof Error ? err.message : String(err)}`);
      // Fall through to launch attempt
    }
  }
  
  // Launch new browser if no connection available
  console.log("🚀 Launching new browser (no connection available)...");
  const browser = await chromium.launch({
    headless: true,
    channel: "chrome",
  });
  return { browser, shouldClose: true };
}

export async function connectToBrowserNonHeadless(): Promise<{ browser: Browser; shouldClose: boolean }> {
  const elementsRoot = findElementsRoot();
  
  const wsEndpoint = process.env.WS_ENDPOINT;
  if (wsEndpoint) {
    try {
      console.log(`📡 Connecting to browser server: ${wsEndpoint}`);
      const browser = await chromium.connect(wsEndpoint);
      return { browser, shouldClose: false };
    } catch (err) {
      console.warn(`Failed to connect to browser server: ${err instanceof Error ? err.message : String(err)}`);
      console.log("🚀 Launching new browser...");
      const browser = await chromium.launch({
        headless: false,
        channel: "chrome",
      });
      return { browser, shouldClose: true };
    }
  }
  
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
      console.log(`[ef open] 📍 WebSocket endpoint from file: ${endpoint}`);
      const browser = await chromium.connect(endpoint);
      console.log(`[ef open] ✅ Connected to browser, contexts: ${browser.contexts().length}`);
      return { browser, shouldClose: false };
    } catch (err) {
      console.warn(`Failed to connect to browser server: ${err instanceof Error ? err.message : String(err)}`);
      console.log("🚀 Launching new browser...");
      const browser = await chromium.launch({
        headless: false,
        channel: "chrome",
      });
      return { browser, shouldClose: true };
    }
  }
  
  console.log("🚀 Launching new browser (no .wsEndpoint.json found)...");
  const browser = await chromium.launch({
    headless: false,
    channel: "chrome",
  });
  return { browser, shouldClose: true };
}
