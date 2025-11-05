import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths()],
  publicDir: "test-assets",
  test: {
    include: ["**/*.browsertest.ts", "**/*.browsertest.tsx"],
    exclude: ["**/node_modules/**", "**/generated/**"],
    /* Globals MUST be enabled for testing library to automatically cleanup between tests */
    globals: true,
    browser: {
      provider: "playwright",
      enabled: true,
      name: "chromium",
      instances: [
        {
          browser: "chromium",
          headless: true,
          // @ts-expect-error Launch options are not typed, but they work. We need to use chrome for h264 decoding
          launch: {
            // Using default Chromium instead of Chrome channel for ARM64 compatibility
          },
        },
      ],
    },
  },
});
