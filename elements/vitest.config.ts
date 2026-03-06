import { defineConfig } from "vitest/config";
import { getAliasesFromTsconfig } from "./vitest.aliases.ts";

export default defineConfig({
  resolve: {
    alias: getAliasesFromTsconfig(),
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
