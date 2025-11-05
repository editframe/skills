import { defineConfig, devices } from "@playwright/test";

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  globalSetup: "./tests/util/global-setup",
  // testMatch: ["./tests/**/*.spec.ts", "./services/web/app/**/*.playwright.ts"],
  testMatch: [
    "services/web/app/routes/**/*.spec.ts",
    "services/web/app/routes/**/*spec.ts",
  ],
  /** Bail out early in CI if 10 tests have failed */
  maxFailures: process.env.CI ? 10 : undefined,
  /* Run tests in files in parallel */
  fullyParallel: process.env.CI ? true : undefined,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 3 : 0,
  workers: process.env.CI ? 1 : 10,
  timeout: process.env.CI ? 40_000 : 15_000,
  expect: {
    // max timeout per step at 5 seconds, will let tests fail faster
    timeout: 10_000,
  },
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "html",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_WEB_HOST,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },

    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },

    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: "sleep infinity",
  //   url: "http://127.0.0.1:3000",
  //   reuseExistingServer: true,
  //   // reuseExistingServer: !process.env.CI,
  // },
});
