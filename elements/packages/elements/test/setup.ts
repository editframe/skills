/**
 * Global test setup for all browser tests
 * This runs before every test to ensure clean state
 */

import { beforeEach, afterAll } from "vitest";
import {
  globalRequestDeduplicator,
  mediaCache,
} from "../src/elements/EFMedia/BaseMediaEngine.js";
import { globalURLTokenDeduplicator } from "../src/transcoding/cache/URLTokenDeduplicator.js";
import { TEST_SERVER_PORT } from "./constants.js";

// Type declarations for test environment
declare global {
  interface Window {
    __CI_MODE__?: boolean;
  }
}

/**
 * Get the correct API host for the current environment.
 * In local dev with Traefik, returns the Traefik URL (e.g., http://main.localhost:4322).
 * In CI or direct access, returns the current location (e.g., http://localhost:63315).
 */
export function getApiHost(): string {
  const host = window.location.host;
  const protocol = window.location.protocol;

  // Check if CI mode was injected by server
  const isCI = (window as any).__CI_MODE__ === true;

  if (isCI) {
    // CI mode: always use localhost directly
    return `${protocol}//${host}`;
  }

  if (host === `localhost:${TEST_SERVER_PORT}`) {
    // Check if we have a Traefik referrer (local dev)
    const traefikReferrer = document.referrer.match(/\/\/([^:]+):4322/)?.[1];
    if (traefikReferrer) {
      // Local dev: use Traefik URL
      return `${protocol}//${traefikReferrer}:4322`;
    }
    // No Traefik referrer but not explicitly CI: use localhost directly
    return `${protocol}//${host}`;
  }
  // Already on Traefik URL or other configuration
  return `${protocol}//${host}`;
}

// Clear global caches before each test to ensure isolation
beforeEach(() => {
  globalRequestDeduplicator.clear();
  mediaCache.clear();
  globalURLTokenDeduplicator.clear();
});
