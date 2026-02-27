/**
 * Determines whether a URL should be signed before fetching.
 *
 * Signing is skipped for:
 * - Local vite plugin endpoints (/@ef-*)
 * - Same-origin URLs (local dev server routes like /api/v1/transcode/*)
 *
 * @param url - The URL to evaluate
 * @param currentOrigin - The current page origin (window.location.origin)
 */
export function shouldSignUrl(url: string, currentOrigin: string): boolean {
  if (url.startsWith("/@ef-")) return false;

  try {
    const targetUrl = new URL(url, currentOrigin);
    return targetUrl.origin !== currentOrigin;
  } catch {
    return true;
  }
}
