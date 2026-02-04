/**
 * Rendering strategy configurations for smoke tests.
 * 
 * We test 5 different rendering strategies to ensure all paths work:
 * 1. server: Electron offscreen rendering (default, fastest)
 * 2-5. Browser-based rendering with different canvas modes
 */

import type { RenderMode, CanvasMode } from "../utils/render";

export interface RenderStrategy {
  name: string;
  renderMode: RenderMode;
  canvasMode?: CanvasMode;
  description: string;
}

export const ALL_STRATEGIES: RenderStrategy[] = [
  {
    name: "server",
    renderMode: "server",
    description: "Electron offscreen rendering (default)",
  },
  {
    name: "browser-full-video-foreignObject",
    renderMode: "browser-full-video",
    canvasMode: "foreignObject",
    description: "Browser full-video with SVG foreignObject",
  },
  {
    name: "browser-full-video-native",
    renderMode: "browser-full-video",
    canvasMode: "native",
    description: "Browser full-video with native canvas",
  },
  {
    name: "browser-frame-by-frame-foreignObject",
    renderMode: "browser-frame-by-frame",
    canvasMode: "foreignObject",
    description: "Browser frame-by-frame with SVG foreignObject",
  },
  {
    name: "browser-frame-by-frame-native",
    renderMode: "browser-frame-by-frame",
    canvasMode: "native",
    description: "Browser frame-by-frame with native canvas",
  },
];

/**
 * Get strategy by name for filtered test runs
 */
export function getStrategy(name: string): RenderStrategy | undefined {
  return ALL_STRATEGIES.find(s => s.name === name);
}

/**
 * Get strategies to test based on environment or filter
 * Defaults to server-only for fast feedback, run all in CI
 */
export function getStrategiesToTest(): RenderStrategy[] {
  // If running with specific filter, only test matching strategies
  const filter = process.env.RENDER_STRATEGY;
  if (filter) {
    const strategy = getStrategy(filter);
    if (!strategy) {
      throw new Error(`Unknown render strategy: ${filter}. Available: ${ALL_STRATEGIES.map(s => s.name).join(", ")}`);
    }
    console.log(`[getStrategiesToTest] Using filtered strategy: ${strategy.name}`);
    return [strategy];
  }
  
  // In CI or when explicitly requested, test all strategies
  if (process.env.CI === "true" || process.env.TEST_ALL_STRATEGIES === "true") {
    console.log(`[getStrategiesToTest] Testing ALL strategies (${ALL_STRATEGIES.length})`);
    return ALL_STRATEGIES;
  }
  
  // Default: server-only for fast local feedback
  console.log(`[getStrategiesToTest] Testing server-only (default for fast feedback)`);
  return [ALL_STRATEGIES[0]];
}
