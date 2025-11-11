/**
 * Global test setup for all browser tests
 * This runs before every test to ensure clean state
 */

import { beforeEach } from "vitest";
import {
  globalRequestDeduplicator,
  mediaCache,
} from "../src/elements/EFMedia/BaseMediaEngine.js";
import { globalURLTokenDeduplicator } from "../src/transcoding/cache/URLTokenDeduplicator.js";

// Inject worktree domain into window for use in tests
// This allows tests to construct correct API URLs when running on localhost:63315
if (typeof window !== "undefined") {
  // Extract worktree domain from the current URL or use default
  // If we're on localhost:63315, we need to use the Traefik URL (main.localhost:4322)
  const host = window.location.host;
  if (host === "localhost:63315") {
    // Try to extract from referrer, or use default
    const worktreeDomain =
      document.referrer.match(/\/\/([^:]+):4322/)?.[1] || "main.localhost";
    (window as any).__WORKTREE_DOMAIN__ = worktreeDomain;
  } else {
    // Extract from current host (e.g., main.localhost:4322 -> main.localhost)
    const match = host.match(/^([^:]+):4322$/);
    if (match) {
      (window as any).__WORKTREE_DOMAIN__ = match[1];
    }
  }
}

// Clear global caches before each test to ensure isolation
beforeEach(() => {
  globalRequestDeduplicator.clear();
  mediaCache.clear();
  globalURLTokenDeduplicator.clear();
});
