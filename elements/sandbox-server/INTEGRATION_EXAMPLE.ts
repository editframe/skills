/**
 * Example: How to add sandbox routes to your dev-projects/start.ts
 * 
 * Since dev-projects/ is gitignored, add this to your existing dev-projects/start.ts file.
 * The file runs via: npx tsx ./dev-projects/start.ts in the Docker container.
 */

// Example 1: If using Vite createServer directly
/*
import { createServer } from "vite";
import { sandboxPlugin } from "../sandbox-server/vite-plugin.js";

const server = await createServer({
  root: "./dev-projects",
  plugins: [
    // ... your existing plugins
    sandboxPlugin(), // Add this line - it will auto-detect monorepo root
  ],
  server: {
    port: 4321,
  },
});

await server.listen();
console.log("Listening on 4321");
*/

// Example 2: If using a separate vite.config.ts
/*
// In dev-projects/vite.config.ts:
import { sandboxPlugin } from "../sandbox-server/vite-plugin.js";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    // ... your existing plugins
    sandboxPlugin(), // Add this
  ],
});
*/
