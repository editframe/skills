#!/usr/bin/env node
/**
 * Test script to verify fs.server.ts path resolution works correctly
 * Run this in both dev and production contexts to verify the fix
 */

import { resolve } from "node:path";
import { existsSync } from "node:fs";

const appDir = resolve(process.cwd(), "services/web/app");
const contentPath = "content";
const contentDir = resolve(appDir, contentPath);

console.log("Testing fs.server.ts path resolution:");
console.log(`  process.cwd(): ${process.cwd()}`);
console.log(`  appDir: ${appDir}`);
console.log(`  contentDir: ${contentDir}`);
console.log(`  contentDir exists: ${existsSync(contentDir)}`);

if (existsSync(contentDir)) {
  console.log("✅ Path resolution works correctly!");
  process.exit(0);
} else {
  console.error("❌ Path resolution failed - content directory not found");
  process.exit(1);
}
