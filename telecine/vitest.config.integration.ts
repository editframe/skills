import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/generated/**"],
    globals: true,
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
