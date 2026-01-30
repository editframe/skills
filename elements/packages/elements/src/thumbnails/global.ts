/**
 * Global Thumbnail System Instances
 * 
 * Single shared instances across the application for:
 * - Content version tracking
 * - Viewport evaluation
 * - Thumbnail caching
 * - Thumbnail generation
 * - Coordination
 */

import { ThumbnailCoordinator } from "./ThumbnailCoordinator.js";
import { ContentVersionTracker } from "./ContentVersionTracker.js";
import { ViewportOracle } from "./ViewportOracle.js";
import { ThumbnailCache } from "./ThumbnailCache.js";
import { ThumbnailGenerator } from "./ThumbnailGenerator.js";

// Global singleton instances (one per application)
export const globalContentVersionTracker = new ContentVersionTracker();
export const globalViewportOracle = new ViewportOracle();
export const globalThumbnailCache = new ThumbnailCache();
export const globalThumbnailGenerator = new ThumbnailGenerator();

export const globalThumbnailCoordinator = new ThumbnailCoordinator({
  versionTracker: globalContentVersionTracker,
  viewport: globalViewportOracle,
  cache: globalThumbnailCache,
  generator: globalThumbnailGenerator,
});

// Expose for debugging in development
if (typeof window !== "undefined" && import.meta.env?.DEV) {
  (window as any).__thumbnailSystem = {
    coordinator: globalThumbnailCoordinator,
    versionTracker: globalContentVersionTracker,
    viewport: globalViewportOracle,
    cache: globalThumbnailCache,
    generator: globalThumbnailGenerator,
  };
}
