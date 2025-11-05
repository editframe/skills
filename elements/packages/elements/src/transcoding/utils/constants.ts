/**
 * Constants for JIT transcoding system
 */

import type { QualityPresets } from "../types/index.js";

/**
 * Segment duration constants (in milliseconds)
 */
export const SEGMENT_DURATION_VIDEO_MS = 2000; // 2 seconds
export const SEGMENT_DURATION_AUDIO_MS = 15000; // 15 seconds
export const SEGMENT_DURATION_SCRUB_MS = 30000; // 30 seconds

/**
 * Default cache sizes for different media types
 */
export const DEFAULT_CACHE_SIZE_VIDEO = 50;
export const DEFAULT_CACHE_SIZE_AUDIO = 20;

/**
 * Default prefetch settings
 */
export const DEFAULT_PREFETCH_SEGMENTS_VIDEO = 3;
export const DEFAULT_PREFETCH_SEGMENTS_AUDIO = 2;

/**
 * Retry configuration
 */
export const RETRY_MAX_ATTEMPTS = 3;
export const RETRY_BASE_DELAY_MS = 500;

/**
 * Default service configuration
 */
export const DEFAULT_BASE_URL = "http://localhost:3000";
export const DEFAULT_QUALITY: keyof QualityPresets = "medium";
