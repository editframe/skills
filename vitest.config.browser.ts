import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import type { LaunchOptions } from "playwright";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ["**/*.test.tsx", "**/*.browsertest.ts"],
    /* Globals MUST be enabled for testing library to automatically cleanup between tests */
    globals: true,
    browser: {
      enabled: true,
      provider: "playwright",
      name: "chromium", // browser name is required"
      providerOptions: {
        // This is supposed to be properly typed by including a path in the tsconfig `types` array.
        // However, it doesn't seem to work. So, we are using satisfies here.
        launch: {
          devtools: true,
          channel: "chrome",
          downloadsPath: "/Users/collin/Downloads",
        } satisfies LaunchOptions,
      },
    },
  },
});
