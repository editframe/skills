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

      // Render tests requiring Electron
      "services/render/**",
      "lib/render/engines/ElectronEngine/test/**",
      "lib/render/SegmentEncoder*",
      "lib/electron-exec/**",
      "lib/queues/units-of-work/Render/tests/**",
      "lib/queues/units-of-work/Render/animejs-render.test.ts",
      "lib/queues/units-of-work/Render/render.test.ts",
      "lib/queues/units-of-work/Render/PlaywrightEngine.test.ts",
      "lib/queues/units-of-work/Render/segmentation.test.ts",
      "lib/queues/units-of-work/Render/RenderFragment.test.ts",

      // Integration tests requiring running services (web server, Valkey, Go scheduler, etc.)
      "tests/integration/**",
      "tests/@editframe/**",
      "services/web/app/api/v1/**",
      "services/web/app/hdb/**",
      "services/jit-transcode-go/tests/**",
      "lib/transcode/src/jit/test/**",
      "lib/transcode/src/jit/transcoding-service.test.ts",
      "lib/queues/Queue.test.ts",
      "lib/queues/Scheduler.test.ts",
      "lib/process-file/processISOBMFF.fragments.test.ts",

      // Transcribe tests require heavy resources
      "services/transcribe/src/**",
    ],
    /* Globals MUST be enabled for testing library to automatically cleanup between tests */
    globals: true,
  },
});
