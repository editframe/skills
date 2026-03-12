import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/generated/**"],
    globals: true,
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
