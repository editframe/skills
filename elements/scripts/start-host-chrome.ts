import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import * as path from "node:path";
import { chromium } from "playwright";

function findMonorepoRoot(): string | null {
  try {
    const gitRoot = execSync("git rev-parse --show-toplevel", {
      encoding: "utf-8",
      stdio: "pipe",
    }).trim();
    
    if (existsSync(path.join(gitRoot, "elements")) && existsSync(path.join(gitRoot, "telecine"))) {
      return gitRoot;
    }
  } catch {
    // Not in git repo or git command failed
  }
  
  let currentDir = __dirname;
  while (currentDir !== path.dirname(currentDir)) {
    if (existsSync(path.join(currentDir, "elements")) && existsSync(path.join(currentDir, "telecine"))) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }
  
  return null;
}

function findTargetRoot(): string {
  const monorepoRoot = findMonorepoRoot();
  if (monorepoRoot) {
    return monorepoRoot;
  }
  return path.resolve(__dirname, "..");
}

const targetRoot = findTargetRoot();
const wsEndpointPath = path.join(targetRoot, ".wsEndpoint.json");

// Launch a Playwright browser server, not just Chrome
const browserServer = await chromium.launchServer({
  headless: false,
  host: "0.0.0.0",
  channel: "chrome", // Uses system Chrome
  args: [
    "--autoplay-policy=no-user-gesture-required", // Allow AudioContext without user interaction
  ],
});

const wsEndpoint = browserServer
  .wsEndpoint()
  .replace("0.0.0.0", "host.docker.internal");
await writeFile(wsEndpointPath, JSON.stringify({ wsEndpoint }, null, 2));
console.log("Playwright wsEndpoint:", wsEndpoint);
console.log("Written to:", wsEndpointPath);

process.on("exit", () => {
  console.log("exit");
  browserServer.close();
});
