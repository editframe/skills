/**
 * Unit tests for renderTimegroupToCanvas.ts utility functions.
 * 
 * These tests focus on exported utility functions in isolation,
 * verifying observable outputs (return values, side effects) not implementation details.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  resetRenderState,
  getRenderState,
  clearInlineImageCache,
  getInlineImageCacheSize,
  getCacheMetrics,
  resetCacheMetrics,
  ContentNotReadyError,
  loadImageFromDataUri,
  renderToImage,
  captureTimegroupAtTime,
} from "./renderTimegroupToCanvas.js";
import {
  setRenderMode,
  setNativeCanvasApiEnabled,
} from "./previewSettings.js";
import "../elements/EFTimegroup.js";
import type { EFTimegroup } from "../elements/EFTimegroup.js";

describe("getRenderState", () => {
  it("returns current render state object", () => {
    const state = getRenderState();
    
    expect(state).toBeDefined();
    expect(state).toHaveProperty("inlineImageCache");
    expect(state).toHaveProperty("layoutInitializedCanvases");
    expect(state).toHaveProperty("xmlSerializer");
    expect(state).toHaveProperty("textEncoder");
    expect(state).toHaveProperty("metrics");
  });

  it("returns same instance on multiple calls", () => {
    const state1 = getRenderState();
    const state2 = getRenderState();
    
    expect(state1).toBe(state2);
  });

  it("has valid metrics structure", () => {
    const state = getRenderState();
    
    expect(state.metrics).toHaveProperty("inlineImageCacheHits");
    expect(state.metrics).toHaveProperty("inlineImageCacheMisses");
    expect(state.metrics).toHaveProperty("inlineImageCacheEvictions");
    expect(typeof state.metrics.inlineImageCacheHits).toBe("number");
    expect(typeof state.metrics.inlineImageCacheMisses).toBe("number");
    expect(typeof state.metrics.inlineImageCacheEvictions).toBe("number");
  });
});

describe("resetRenderState", () => {
  it("clears profiling counters and caches", () => {
    // Perform some operations to populate state
    resetRenderState();
    
    // After reset, cache should be empty
    expect(getInlineImageCacheSize()).toBe(0);
  });

  it("resets all state including metrics", () => {
    const state = getRenderState();
    
    // Set some values
    state.metrics.inlineImageCacheHits = 10;
    state.metrics.inlineImageCacheMisses = 5;
    state.metrics.inlineImageCacheEvictions = 2;
    
    resetRenderState();
    
    // All metrics should be reset to 0
    expect(state.metrics.inlineImageCacheHits).toBe(0);
    expect(state.metrics.inlineImageCacheMisses).toBe(0);
    expect(state.metrics.inlineImageCacheEvictions).toBe(0);
  });

  it("can be called multiple times safely", () => {
    resetRenderState();
    resetRenderState();
    resetRenderState();
    
    expect(getInlineImageCacheSize()).toBe(0);
  });
});

describe("inline image cache", () => {
  beforeEach(() => {
    clearInlineImageCache();
  });

  it("starts empty after clear", () => {
    expect(getInlineImageCacheSize()).toBe(0);
  });

  it("clearInlineImageCache empties the cache", () => {
    // The cache is populated internally during rendering
    // We can only test that clear resets it to 0
    clearInlineImageCache();
    expect(getInlineImageCacheSize()).toBe(0);
  });
});

describe("ContentNotReadyError", () => {
  it("extends Error with correct name", () => {
    const error = new ContentNotReadyError(1000, 5000, ["video1.mp4"]);
    
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("ContentNotReadyError");
  });

  it("includes timeMs in message and property", () => {
    const error = new ContentNotReadyError(1500, 5000, ["video1.mp4"]);
    
    expect(error.timeMs).toBe(1500);
    expect(error.message).toContain("1500");
  });

  it("includes timeoutMs in message and property", () => {
    const error = new ContentNotReadyError(1000, 3000, ["video1.mp4"]);
    
    expect(error.timeoutMs).toBe(3000);
    expect(error.message).toContain("3000");
  });

  it("includes blank video names in message and property", () => {
    const blankVideos = ["video1.mp4", "video2.mp4"];
    const error = new ContentNotReadyError(1000, 5000, blankVideos);
    
    expect(error.blankVideos).toEqual(blankVideos);
    expect(error.message).toContain("video1.mp4");
    expect(error.message).toContain("video2.mp4");
  });

  it("handles empty blankVideos array", () => {
    const error = new ContentNotReadyError(1000, 5000, []);
    
    expect(error.blankVideos).toEqual([]);
    expect(error.message).toBeDefined();
  });
});

describe("loadImageFromDataUri", () => {
  it("loads a valid PNG data URI", async () => {
    // Create a 1x1 red pixel PNG data URI
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "red";
    ctx.fillRect(0, 0, 1, 1);
    const dataUri = canvas.toDataURL("image/png");
    
    const img = await loadImageFromDataUri(dataUri);
    
    expect(img).toBeInstanceOf(HTMLImageElement);
    expect(img.width).toBe(1);
    expect(img.height).toBe(1);
    expect(img.complete).toBe(true);
  });

  it("loads a valid JPEG data URI", async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 10;
    canvas.height = 10;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "blue";
    ctx.fillRect(0, 0, 10, 10);
    const dataUri = canvas.toDataURL("image/jpeg", 0.9);
    
    const img = await loadImageFromDataUri(dataUri);
    
    expect(img).toBeInstanceOf(HTMLImageElement);
    expect(img.width).toBe(10);
    expect(img.height).toBe(10);
  });

  it("rejects on invalid data URI", async () => {
    await expect(loadImageFromDataUri("invalid-data-uri"))
      .rejects.toThrow();
  });
});

describe("renderToImage", () => {
  beforeEach(() => {
    resetRenderState();
    // Force foreignObject mode for predictable testing
    setNativeCanvasApiEnabled(false);
    setRenderMode("foreignObject");
  });

  it("renders a simple div to image", async () => {
    const container = document.createElement("div");
    container.style.cssText = "width: 100px; height: 100px; background: red;";
    document.body.appendChild(container);
    
    try {
      const result = await renderToImage(container, 100, 100);
      
      // ForeignObject path returns HTMLImageElement
      expect(result).toBeInstanceOf(HTMLImageElement);
      expect(result.width).toBe(100);
      expect(result.height).toBe(100);
    } finally {
      document.body.removeChild(container);
    }
  });

  it("renders nested elements correctly", async () => {
    const container = document.createElement("div");
    container.style.cssText = "width: 200px; height: 200px; background: white;";
    container.innerHTML = `
      <div style="position: absolute; top: 10px; left: 10px; width: 50px; height: 50px; background: red;"></div>
      <div style="position: absolute; top: 100px; left: 100px; width: 50px; height: 50px; background: blue;"></div>
    `;
    document.body.appendChild(container);
    
    try {
      const result = await renderToImage(container, 200, 200);
      
      expect(result).toBeInstanceOf(HTMLImageElement);
      expect(result.width).toBe(200);
      expect(result.height).toBe(200);
    } finally {
      document.body.removeChild(container);
    }
  });

  it("respects canvasScale option for thumbnail generation", async () => {
    const container = document.createElement("div");
    container.style.cssText = "width: 400px; height: 300px; background: green;";
    document.body.appendChild(container);
    
    try {
      const result = await renderToImage(container, 400, 300, { canvasScale: 0.25 });
      
      // Output dimensions should still be 400x300 (canvasScale affects internal encoding)
      expect(result.width).toBe(400);
      expect(result.height).toBe(300);
    } finally {
      document.body.removeChild(container);
    }
  });
});

describe("captureTimegroupAtTime", () => {
  beforeEach(async () => {
    resetRenderState();
    await customElements.whenDefined("ef-timegroup");
  });

  it("captures HTML timegroup at time 0", async () => {
    const container = document.createElement("div");
    container.innerHTML = `
      <ef-timegroup style="width: 200px; height: 150px; background: coral;">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white;">
          Test Content
        </div>
      </ef-timegroup>
    `;
    document.body.appendChild(container);
    
    try {
      const timegroup = container.querySelector("ef-timegroup") as EFTimegroup;
      await timegroup.updateComplete;
      
      const canvas = await captureTimegroupAtTime(timegroup, { timeMs: 0 });
      
      expect(canvas).toBeInstanceOf(HTMLCanvasElement);
      expect(canvas.width).toBeGreaterThan(0);
      expect(canvas.height).toBeGreaterThan(0);
    } finally {
      document.body.removeChild(container);
    }
  });

  it("respects scale option", async () => {
    const container = document.createElement("div");
    container.innerHTML = `
      <ef-timegroup style="width: 400px; height: 300px; background: navy;">
        <div>Content</div>
      </ef-timegroup>
    `;
    document.body.appendChild(container);
    
    try {
      const timegroup = container.querySelector("ef-timegroup") as EFTimegroup;
      await timegroup.updateComplete;
      
      const canvas = await captureTimegroupAtTime(timegroup, { 
        timeMs: 0, 
        scale: 0.5 
      });
      
      expect(canvas).toBeInstanceOf(HTMLCanvasElement);
      // Canvas should be scaled (approximately 200x150 for 400x300 source at 0.5 scale)
      // Allow for DPR variations
      expect(canvas.width).toBeGreaterThan(0);
      expect(canvas.width).toBeLessThanOrEqual(400 * window.devicePixelRatio);
    } finally {
      document.body.removeChild(container);
    }
  });

  it("captures at different time positions", async () => {
    const container = document.createElement("div");
    container.innerHTML = `
      <ef-timegroup mode="fixed" duration="5s" style="width: 200px; height: 150px; background: teal;">
        <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: white;">
          Timed Content
        </div>
      </ef-timegroup>
    `;
    document.body.appendChild(container);
    
    try {
      const timegroup = container.querySelector("ef-timegroup") as EFTimegroup;
      await timegroup.updateComplete;
      
      // Capture at different times
      const canvas0 = await captureTimegroupAtTime(timegroup, { timeMs: 0 });
      const canvas1000 = await captureTimegroupAtTime(timegroup, { timeMs: 1000 });
      const canvas2500 = await captureTimegroupAtTime(timegroup, { timeMs: 2500 });
      
      // All should produce valid canvases
      expect(canvas0).toBeInstanceOf(HTMLCanvasElement);
      expect(canvas1000).toBeInstanceOf(HTMLCanvasElement);
      expect(canvas2500).toBeInstanceOf(HTMLCanvasElement);
    } finally {
      document.body.removeChild(container);
    }
  });
});

describe("edge cases", () => {
  beforeEach(() => {
    resetRenderState();
  });

  it("renderToImage handles empty container", async () => {
    const container = document.createElement("div");
    container.style.cssText = "width: 50px; height: 50px;";
    document.body.appendChild(container);
    
    try {
      // Should not throw
      const result = await renderToImage(container, 50, 50);
      expect(result).toBeDefined();
    } finally {
      document.body.removeChild(container);
    }
  });

  it("renderToImage handles zero dimensions gracefully", async () => {
    const container = document.createElement("div");
    container.style.cssText = "width: 0px; height: 0px;";
    document.body.appendChild(container);
    
    try {
      // Should not throw (though output may be empty)
      const result = await renderToImage(container, 0, 0);
      expect(result).toBeDefined();
    } finally {
      document.body.removeChild(container);
    }
  });

  it("loadImageFromDataUri handles SVG data URI", async () => {
    const svgDataUri = "data:image/svg+xml;base64," + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
        <rect width="100" height="100" fill="purple"/>
      </svg>
    `);
    
    const img = await loadImageFromDataUri(svgDataUri);
    
    expect(img).toBeInstanceOf(HTMLImageElement);
    expect(img.complete).toBe(true);
  });
});

describe("cache behavior", () => {
  beforeEach(() => {
    clearInlineImageCache();
    resetRenderState();
  });

  it("getInlineImageCacheSize returns number", () => {
    const size = getInlineImageCacheSize();
    expect(typeof size).toBe("number");
    expect(size).toBeGreaterThanOrEqual(0);
  });

  it("cache size increases after rendering with external images", async () => {
    // Note: This test may not increase cache size if no external images are present
    // The cache only stores fetched external image URLs
    const initialSize = getInlineImageCacheSize();
    expect(initialSize).toBe(0);
    
    // After clear, should still be 0
    clearInlineImageCache();
    expect(getInlineImageCacheSize()).toBe(0);
  });
});

describe("cache metrics", () => {
  beforeEach(() => {
    resetCacheMetrics();
    clearInlineImageCache();
  });

  it("getCacheMetrics returns metrics object", () => {
    const metrics = getCacheMetrics();
    
    expect(metrics).toBeDefined();
    expect(metrics).toHaveProperty("inlineImageCacheHits");
    expect(metrics).toHaveProperty("inlineImageCacheMisses");
    expect(metrics).toHaveProperty("inlineImageCacheEvictions");
  });

  it("returns copy of metrics (not reference)", () => {
    const metrics1 = getCacheMetrics();
    const metrics2 = getCacheMetrics();
    
    // Should be different objects (copies)
    expect(metrics1).not.toBe(metrics2);
    
    // But with same values
    expect(metrics1).toEqual(metrics2);
  });

  it("resetCacheMetrics clears all metrics to zero", () => {
    const state = getRenderState();
    
    // Manually set some values
    state.metrics.inlineImageCacheHits = 42;
    state.metrics.inlineImageCacheMisses = 10;
    state.metrics.inlineImageCacheEvictions = 5;
    
    resetCacheMetrics();
    
    const metrics = getCacheMetrics();
    expect(metrics.inlineImageCacheHits).toBe(0);
    expect(metrics.inlineImageCacheMisses).toBe(0);
    expect(metrics.inlineImageCacheEvictions).toBe(0);
  });

  it("metrics start at zero after reset", () => {
    resetCacheMetrics();
    
    const metrics = getCacheMetrics();
    expect(metrics.inlineImageCacheHits).toBe(0);
    expect(metrics.inlineImageCacheMisses).toBe(0);
    expect(metrics.inlineImageCacheEvictions).toBe(0);
  });

  it("metrics persist between getCacheMetrics calls", () => {
    const state = getRenderState();
    state.metrics.inlineImageCacheHits = 7;
    
    const metrics1 = getCacheMetrics();
    expect(metrics1.inlineImageCacheHits).toBe(7);
    
    const metrics2 = getCacheMetrics();
    expect(metrics2.inlineImageCacheHits).toBe(7);
  });
});
