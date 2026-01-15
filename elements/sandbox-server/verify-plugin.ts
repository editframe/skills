#!/usr/bin/env npx tsx
/**
 * Verify that the sandbox plugin can be imported and configured
 * Run: npx tsx sandbox-server/verify-plugin.ts
 */

import { sandboxPlugin } from "./vite-plugin.js";
import { createServer } from "vite";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function test() {
  console.log("Testing sandbox plugin...\n");

  try {
    // Create a minimal Vite server config with the plugin
    const server = await createServer({
      root: path.join(__dirname, ".."),
      plugins: [
        sandboxPlugin(),
      ],
      server: {
        port: 4322, // Different port to avoid conflicts
      },
    });

    console.log("✅ Plugin loaded successfully!");
    console.log(`   Server root: ${server.config.root}`);
    
    await server.close();
    console.log("\n✅ Test passed - plugin can be loaded in Vite");
  } catch (error) {
    console.error("❌ Error loading plugin:", error);
    process.exit(1);
  }
}

test();
