import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@editframe/assets": path.resolve(__dirname, "packages/assets/src"),
      "@editframe/cli": path.resolve(__dirname, "packages/cli/src"),
      "@editframe/api": path.resolve(__dirname, "packages/api/src"),
      "@editframe/react": path.resolve(__dirname, "packages/react/src"),
      "@editframe/elements": path.resolve(__dirname, "packages/elements/src"),
      "@editframe/vite-plugin": path.resolve(
        __dirname,
        "packages/vite-plugin/src",
      ),
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
