import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getPackageAliases(): Record<string, string> {
  const packagesDir = path.join(__dirname, "packages");
  const aliases: Record<string, string> = {};
  for (const dir of readdirSync(packagesDir)) {
    try {
      const pkg = JSON.parse(
        readFileSync(path.join(packagesDir, dir, "package.json"), "utf-8"),
      );
      if (typeof pkg.name === "string" && pkg.name.startsWith("@editframe/")) {
        aliases[pkg.name] = path.join(packagesDir, dir, "src");
      }
    } catch {
      // no package.json — skip
    }
  }
  return aliases;
}

export default defineConfig({
  resolve: {
    alias: {
      ...getPackageAliases(),
      TEST: path.resolve(__dirname, "test"),
    },
  },
  test: {
    watch: false,
    environment: "node",
    maxWorkers: 6,
    isolate: false,
    setupFiles: ["./packages/elements/test/setup.ts"],
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["**/node_modules/**", "**/generated/**"],
    /* Globals MUST be enabled for testing library to automatically cleanup between tests */
    globals: true,
  },
});
