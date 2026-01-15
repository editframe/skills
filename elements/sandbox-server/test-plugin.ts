#!/usr/bin/env npx tsx
/**
 * Test script to verify sandbox plugin can find sandboxes
 */

import { discoverSandboxes } from "./discover.js";
import * as path from "node:path";
import * as fs from "node:fs";

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

import { fileURLToPath } from "node:url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const monorepoRoot = findMonorepoRoot(__dirname);
if (!monorepoRoot) {
  console.error("Could not find monorepo root");
  process.exit(1);
}

const elementsRoot = path.join(monorepoRoot, "elements");
const elementsSrc = path.join(elementsRoot, "packages", "elements", "src");

console.log(`Monorepo root: ${monorepoRoot}`);
console.log(`Elements root: ${elementsRoot}`);
console.log(`Elements src: ${elementsSrc}`);
console.log(`Exists: ${fs.existsSync(elementsSrc)}`);

const sandboxes = discoverSandboxes(elementsRoot);
console.log(`\nFound ${sandboxes.length} sandboxes:`);
for (const s of sandboxes) {
  console.log(`  - ${s.elementName}: ${s.filePath}`);
}
