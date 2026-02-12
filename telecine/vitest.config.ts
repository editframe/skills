import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  server: {
    watch: {
      ignored: ["**/temp/**/*"],
    },
  },
  test: {
    environment: "jsdom",
    minWorkers: 1,
    maxWorkers: 1,
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    setupFiles: ["./services/load-config.ts", "./test-env.ts"],
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: [
      "**/playwright-report/**/*",
      "/app/renders/**/*",
      "**/data/**/*",
      "**/test-snapshots/**/*",
      "**/temp/**/*",
      "tests/playwright/**",
      "tests/e2e/**",
      "**/node_modules/**",
      "**/generated/**",
      ".archive/**",
      "lib/yjs-persist",
      "lib/packages/packages/**",
      "temp/**",

      // These tests are for the ElectronEngine, which requires executing in electron
      "services/render/**",
      "lib/render/engines/ElectronEngine/test/**",
      // Ignoring SegmentEncoder.server.test.ts because it requires a lot of resources
      // and takes too long to run in a reasonable amount of time.
      // "services/render/src/SegmentEncoder.server.test.ts",
      // Ignoring transcribe tests because they require a lot of resources
      // and take too long to run in a reasonable amount of time.
      "services/transcribe/src/**",
    ],
    /* Globals MUST be enabled for testing library to automatically cleanup between tests */
    globals: true,
  },
});
