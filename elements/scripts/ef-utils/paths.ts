import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function findMonorepoRoot(): string | null {
  // First check if we're in Docker with root-level mounts
  if (fs.existsSync("/elements") && fs.existsSync("/telecine")) {
    return "/";
  }
  
  // __dirname is now in ef-utils/, so start from scripts/ directory
  let currentDir = path.resolve(__dirname, "..");
  
  // In Docker, we might be in /packages (elements root) or /packages/scripts
  // Check if we're already in elements directory
  if (fs.existsSync(path.join(currentDir, "..", "packages", "elements", "src"))) {
    // We're in elements root (/packages)
    // In Docker, monorepo root is / (one level up)
    // But .wsEndpoint.json is at the host monorepo root, which is mounted
    // Try / first, then traverse up
    if (fs.existsSync("/elements") && fs.existsSync("/telecine")) {
      return "/";
    }
    // Otherwise, go up from elements root
    return path.dirname(path.resolve(currentDir, ".."));
  }
  
  // Normal traversal starting from scripts directory
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

export function findElementsRoot(): string {
  // __dirname is now in ef-utils/, so go up to scripts/ first
  const scriptsDir = path.resolve(__dirname, "..");
  
  // In Docker, we might already be in /packages (elements root)
  // Check if scriptsDir/../packages/elements/src exists (meaning scriptsDir is /packages/scripts)
  if (fs.existsSync(path.join(scriptsDir, "..", "packages", "elements", "src"))) {
    return path.resolve(scriptsDir, "..");
  }
  
  // Check if we're in a normal monorepo structure (scripts is at elements/scripts)
  // So elements root would be one level up from scripts
  if (fs.existsSync(path.join(scriptsDir, "..", "sandbox-server"))) {
    return path.resolve(scriptsDir, "..");
  }
  
  const monorepoRoot = findMonorepoRoot();
  if (!monorepoRoot) {
    throw new Error(`Could not find monorepo root. Started from: ${__dirname}`);
  }
  return path.join(monorepoRoot, "elements");
}

export const SCRIPT_NAME = "elements/scripts/ef";
