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

// Clear global caches before each test to ensure isolation
beforeEach(() => {
  globalRequestDeduplicator.clear();
  mediaCache.clear();
  globalURLTokenDeduplicator.clear();
});
