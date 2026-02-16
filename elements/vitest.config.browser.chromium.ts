import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";

export default defineConfig({
  plugins: [tsconfigPaths()],
  publicDir: "test-assets",
  test: {
    include: ["**/*.browsertest.ts", "**/*.browsertest.tsx"],
    exclude: ["**/node_modules/**", "**/generated/**"],
    /* Globals MUST be enabled for testing library to automatically cleanup between tests */
    globals: true,
    browser: {
      provider: playwright(),
      enabled: true,
      instances: [
        {
          browser: "chromium",
          headless: true,
        },
      ],
    },
  },
});
