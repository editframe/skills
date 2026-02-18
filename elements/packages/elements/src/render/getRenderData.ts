/**
 * Helper function for compositions to read custom render data.
 *
 * Supports both runtime data (set by Playwright/CLI via window.EF_RENDER_DATA)
 * and build-time data (set by Vite define as RENDER_DATA).
 */

// Declare RENDER_DATA for TypeScript (set via Vite define at build time)
declare const RENDER_DATA: unknown | undefined;

/**
 * Get custom render data that was passed to the render process.
 *
 * @returns The render data object, or undefined if no data was provided
 *
 * @example
 * ```typescript
 * import { getRenderData } from "@editframe/elements";
 *
 * interface MyRenderData {
 *   userName: string;
 *   theme: "light" | "dark";
 * }
 *
 * const data = getRenderData<MyRenderData>();
 * if (data) {
 *   console.log(data.userName);  // "John"
 * }
 * ```
 */
export function getRenderData<T = unknown>(): T | undefined {
  // Runtime data (set by Playwright/CLI)
  if (typeof window !== "undefined" && window.EF_RENDER_DATA) {
    return window.EF_RENDER_DATA as T;
  }

  // Build-time data (set by Vite define)
  if (typeof RENDER_DATA !== "undefined") {
    return RENDER_DATA as T;
  }

  return undefined;
}
