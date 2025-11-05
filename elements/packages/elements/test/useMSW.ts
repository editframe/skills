/**
 * MSW integration for Vitest Browser Mode
 * Based on: https://mswjs.io/docs/recipes/vitest-browser-mode/
 */

import { setupWorker } from "msw/browser";
import { test as testBase } from "vitest";

// Create the worker instance that will be shared across tests
const worker = setupWorker();

// Start the worker once when this module is loaded
let workerStarted = false;

/**
 * Extended test with MSW worker integration for Vitest Browser Mode
 * This follows the official MSW recommendation for Vitest Browser Mode
 */
export const test = testBase.extend<{
  worker: typeof worker;
}>({
  worker: [
    async ({ expect: _expect }, use) => {
      // Only start the worker once
      if (!workerStarted) {
        await worker.start({
          onUnhandledRequest: "bypass", // Allow unhandled requests to pass through
        });
        workerStarted = true;
      }

      // Use the worker in the test
      await use(worker);
    },
    { scope: "test" },
  ],
});
