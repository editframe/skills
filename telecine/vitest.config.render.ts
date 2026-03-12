import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    setupFiles: ["./services/load-config.ts", "./test-env.ts"],
    include: [
      "lib/queues/units-of-work/Render/tests/**/*.test.ts",
      "lib/render/SegmentEncoder.server.test.ts",
    ],
    exclude: ["**/node_modules/**", "**/generated/**"],
    globals: true,
    testTimeout: 120000,
  },
});
