import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    setupFiles: ["./services/load-config.ts", "./test-env.ts"],
    include: ["lib/queues/units-of-work/Render/tests/**/*.test.ts"],
    exclude: [
      "**/node_modules/**",
      "**/generated/**",
    ],
    globals: true,
    testTimeout: 120000,
  },
});
