import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globalSetup: ["./tests/e2e/global-setup.ts"],
    setupFiles: ["./services/load-config.ts", "./test-env.ts"],
    include: ["tests/e2e/**/*.test.ts"],
    // E2E tests share a browser and must run sequentially
    maxWorkers: 1,
    isolate: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    globals: true,
  },
});
