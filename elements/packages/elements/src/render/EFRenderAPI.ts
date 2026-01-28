/**
 * Window API for programmatic video rendering.
 * 
 * Exposes renderTimegroupToVideo for use from Playwright/CLI.
 * Supports streaming output and custom data injection.
 */

import type { EFTimegroup } from "../elements/EFTimegroup.js";
import type { EFWorkbench } from "../gui/EFWorkbench.js";
import { getRenderInfo, type RenderInfo } from "../getRenderInfo.js";
import {
  renderTimegroupToVideo,
  type RenderToVideoOptions,
  type RenderProgress,
} from "../preview/renderTimegroupToVideo.js";

// ============================================================================
// Types
// ============================================================================

export interface IEFRenderAPI {
  /**
   * Render with streaming output (calls window.onRenderChunk for each chunk).
   * Use this for CLI/Playwright to avoid memory buffering.
   */
  renderStreaming(options?: RenderToVideoOptions): Promise<void>;

  /**
   * Render and return buffer (for shorter videos or in-browser use).
   * Returns the video as Uint8Array.
   */
  render(options?: RenderToVideoOptions): Promise<Uint8Array>;

  /**
   * Get render info (dimensions, duration, assets).
   * Same as the exported getRenderInfo function.
   */
  getRenderInfo(): Promise<RenderInfo>;

  /**
   * Check if SDK is ready for rendering.
   * Returns true if a root timegroup is found.
   */
  isReady(): boolean;
}

declare global {
  interface Window {
    EF_RENDER?: IEFRenderAPI;
    EF_RENDER_DATA?: Record<string, unknown>;
    onRenderChunk?: (chunk: Uint8Array) => void; // Set by Playwright
    onRenderProgress?: (progress: RenderProgress) => void; // Optional progress callback
  }
}

// ============================================================================
// Implementation
// ============================================================================

function findRootTimegroup(): EFTimegroup | null {
  // Try to find timegroup from workbench first
  const workbench = document.querySelector("ef-workbench") as EFWorkbench | null;
  if (workbench) {
    const timegroup = workbench.querySelector("ef-timegroup") as EFTimegroup | null;
    if (timegroup) {
      return timegroup;
    }
  }

  // Fallback: find first root timegroup
  const rootTimegroup = document.querySelector("ef-timegroup") as EFTimegroup | null;
  return rootTimegroup;
}

function setWorkbenchRendering(rendering: boolean): void {
  const workbench = document.querySelector("ef-workbench") as EFWorkbench | null;
  if (workbench) {
    workbench.rendering = rendering;
  }
}

async function waitForTimegroupDimensions(timegroup: EFTimegroup): Promise<void> {
  // Wait for all stylesheets to load first
  console.log('[EFRenderAPI] Waiting for stylesheets to load...');
  console.log(`[EFRenderAPI] Found ${document.styleSheets.length} stylesheets`);
  
  const styleLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
  console.log(`[EFRenderAPI] Found ${styleLinks.length} stylesheet <link> elements`);
  styleLinks.forEach((link, i) => {
    console.log(`[EFRenderAPI]   [${i}] ${(link as HTMLLinkElement).href} - loaded: ${!!(link as HTMLLinkElement).sheet}`);
  });
  
  await Promise.all(
    Array.from(document.styleSheets).map((sheet) => {
      if (sheet.href) {
        // Check if stylesheet is from a <link> tag and wait for it
        const link = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).find(
          (l) => (l as HTMLLinkElement).href === sheet.href
        );
        if (link && !(link as HTMLLinkElement).sheet) {
          console.log(`[EFRenderAPI] Waiting for stylesheet: ${sheet.href}`);
          return new Promise((resolve) => {
            link.addEventListener('load', resolve);
            link.addEventListener('error', resolve);
          });
        }
      }
      return Promise.resolve();
    })
  );
  
  // Wait longer for Vite HMR and Tailwind JIT to process
  console.log('[EFRenderAPI] Waiting for Vite/Tailwind processing...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('[EFRenderAPI] Stylesheets loaded, waiting for timegroup dimensions...');
  
  // Wait for timegroup to have dimensions (CSS must be loaded and processed)
  let attempts = 0;
  while ((!timegroup.offsetWidth || !timegroup.offsetHeight) && attempts < 50) {
    await new Promise(resolve => setTimeout(resolve, 100));
    void timegroup.offsetHeight; // Force layout
    attempts++;
    
    if (attempts % 10 === 0) {
      console.log(`[EFRenderAPI] Still waiting... computed: ${getComputedStyle(timegroup).width} x ${getComputedStyle(timegroup).height}`);
    }
  }
  
  if (!timegroup.offsetWidth || !timegroup.offsetHeight) {
    // Dump more debug info
    console.error('[EFRenderAPI] Timegroup element:', timegroup);
    console.error('[EFRenderAPI] Timegroup classes:', timegroup.className);
    console.error('[EFRenderAPI] Timegroup inline style:', timegroup.getAttribute('style'));
    console.error('[EFRenderAPI] All computed styles:', getComputedStyle(timegroup));
    
    throw new Error(
      `Timegroup has no dimensions after waiting (${timegroup.offsetWidth}x${timegroup.offsetHeight}). ` +
      `Computed styles: width=${getComputedStyle(timegroup).width}, height=${getComputedStyle(timegroup).height}. ` +
      `Classes: ${timegroup.className}. ` +
      `Ensure Tailwind CSS or other stylesheets are loaded and the timegroup has explicit dimensions. ` +
      `Try using inline styles: style="width: 1080px; height: 1920px;"`
    );
  }
  
  console.log(`[EFRenderAPI] Timegroup dimensions ready: ${timegroup.offsetWidth}x${timegroup.offsetHeight}`);
}

const api: IEFRenderAPI = {
  async renderStreaming(options: RenderToVideoOptions = {}): Promise<void> {
    const timegroup = findRootTimegroup();
    if (!timegroup) {
      throw new Error("No ef-timegroup found. Cannot render.");
    }

    // Check if window.onRenderChunk is available
    if (typeof window === "undefined" || !window.onRenderChunk) {
      throw new Error(
        "window.onRenderChunk is not set. " +
        "Call page.exposeFunction('onRenderChunk', callback) from Playwright first."
      );
    }

    // Hide workbench UI during render
    setWorkbenchRendering(true);

    try {
      // Wait for timegroup to have dimensions
      await waitForTimegroupDimensions(timegroup);
      
      // Wait for media to be ready
      await timegroup.waitForMediaDurations();

      // Create custom writable stream that calls window.onRenderChunk
      const chunkWriter = new WritableStream<Uint8Array>({
        write(chunk: Uint8Array) {
          console.error("Writing chunk", chunk);
          if (window.onRenderChunk) {
            window.onRenderChunk(chunk);
          }
        },
      });

      // Merge progress callback if window.onRenderProgress is set
      const onProgress = options.onProgress || window.onRenderProgress;

      // Render with custom stream
      await renderTimegroupToVideo(timegroup, {
        ...options,
        customWritableStream: chunkWriter,
        onProgress,
        returnBuffer: false,
      });
    } finally {
      // Restore workbench UI
      setWorkbenchRendering(false);
    }
  },

  async render(options: RenderToVideoOptions = {}): Promise<Uint8Array> {
    const timegroup = findRootTimegroup();
    if (!timegroup) {
      throw new Error("No ef-timegroup found. Cannot render.");
    }

    // Hide workbench UI during render
    setWorkbenchRendering(true);

    try {
      // Wait for timegroup to have dimensions
      await waitForTimegroupDimensions(timegroup);
      
      // Wait for media to be ready
      await timegroup.waitForMediaDurations();

      // Merge progress callback if window.onRenderProgress is set
      const onProgress = options.onProgress || window.onRenderProgress;

      const buffer = await renderTimegroupToVideo(timegroup, {
        ...options,
        returnBuffer: true,
        onProgress,
      });

      if (!buffer) {
        throw new Error("Render failed: no buffer returned");
      }

      return buffer;
    } finally {
      // Restore workbench UI
      setWorkbenchRendering(false);
    }
  },

  async getRenderInfo(): Promise<RenderInfo> {
    return getRenderInfo();
  },

  isReady(): boolean {
    return findRootTimegroup() !== null;
  },
};

// Export and register on window
if (typeof window !== "undefined") {
  window.EF_RENDER = api;
}

export { api as EFRenderAPI };
export type { IEFRenderAPI as EFRenderAPIInterface };
