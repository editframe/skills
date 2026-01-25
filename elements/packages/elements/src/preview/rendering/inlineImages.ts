/**
 * Image inlining utilities for SVG foreignObject rendering.
 * SVG foreignObject can't load external images due to security restrictions,
 * so we convert them to base64 data URIs.
 */

import { logger } from "../logger.js";

/** Maximum number of cached inline images before eviction */
const MAX_INLINE_IMAGE_CACHE_SIZE = 100;

/** Image cache for inlining external images as data URIs (foreignObject path) */
const _inlineImageCache = new Map<string, string>();

/**
 * Convert a Blob to a data URL.
 */
function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Inline all images in a container as base64 data URIs.
 * SVG foreignObject can't load external images due to security restrictions.
 * Uses an LRU-style cache with size limits to prevent memory leaks.
 */
export async function inlineImages(container: HTMLElement): Promise<void> {
  const images = container.querySelectorAll("img");
  for (const image of images) {
    const src = image.getAttribute("src");
    if (!src || src.startsWith("data:")) continue;

    const cached = _inlineImageCache.get(src);
    if (cached) {
      image.setAttribute("src", cached);
      continue;
    }

    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const dataUrl = await blobToDataURL(blob);
      image.setAttribute("src", dataUrl);
      
      // Evict oldest entries if cache is full (simple FIFO eviction)
      if (_inlineImageCache.size >= MAX_INLINE_IMAGE_CACHE_SIZE) {
        const firstKey = _inlineImageCache.keys().next().value;
        if (firstKey) _inlineImageCache.delete(firstKey);
      }
      _inlineImageCache.set(src, dataUrl);
    } catch (e) {
      logger.warn("Failed to inline image:", src, e);
    }
  }
}

/**
 * Clear the inline image cache. Useful for memory management in long-running sessions.
 */
export function clearInlineImageCache(): void {
  _inlineImageCache.clear();
}

/**
 * Get current inline image cache size for diagnostics.
 */
export function getInlineImageCacheSize(): number {
  return _inlineImageCache.size;
}
