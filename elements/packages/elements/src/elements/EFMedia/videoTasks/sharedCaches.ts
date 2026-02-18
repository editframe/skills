/**
 * Shared singleton cache instances for video seeking.
 *
 * IMPORTANT: Import these from this module only to ensure single instances.
 * Do not create your own MainVideoInputCache or ScrubInputCache instances.
 */

import { MainVideoInputCache } from "./MainVideoInputCache.js";
import { ScrubInputCache } from "./ScrubInputCache.js";

// Singleton instances - shared across all video elements
export const mainVideoInputCache = new MainVideoInputCache();
export const scrubInputCache = new ScrubInputCache();
