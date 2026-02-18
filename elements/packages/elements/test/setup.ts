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
    __PROFILER_STOP_REQUESTED__?: boolean;
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

// Signal profiler to stop before tests finish
afterAll(() => {
  if (typeof window !== "undefined") {
    // Always set the flag, creating it if it doesn't exist
    // This handles both profiled and non-profiled test runs
    console.log("[Profiler] Signaling stop...");
    (window as any).__PROFILER_STOP_REQUESTED__ = true;

    // Give profiler time to detect the signal and retrieve profile data
    // Poll interval is 50ms, so wait longer to ensure detection + retrieval
    return new Promise((resolve) => setTimeout(resolve, 500));
  }
});
