/**
 * Tests for SerializationWorkerPool to verify parallel frame processing.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getSerializationWorkerPool, resetSerializationWorkerPool } from "./SerializationWorkerPool.js";

describe("SerializationWorkerPool", () => {
  afterAll(() => {
    resetSerializationWorkerPool();
  });

  it("should create a worker pool if workers are supported", () => {
    const pool = getSerializationWorkerPool();
    
    // Pool might be null in test environment without worker support
    if (typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined') {
      expect(pool).toBeTruthy();
      if (pool) {
        expect(pool.isAvailable()).toBe(true);
        expect(pool.workerCount).toBeGreaterThan(0);
      }
    } else {
      expect(pool).toBeNull();
    }
  });

  it("should serialize a simple HTML frame", async () => {
    const pool = getSerializationWorkerPool();
    
    // Skip test if workers not available
    if (!pool || !pool.isAvailable()) {
      console.log("Skipping test - workers not available");
      return;
    }

    const htmlString = '<div style="width:100%;height:100%;background:red;">Test</div>';
    const canvases: any[] = [];
    const width = 100;
    const height = 100;

    const svgDataUrl = await pool.serializeFrame(htmlString, canvases, width, height);
    
    expect(svgDataUrl).toBeTruthy();
    expect(svgDataUrl.startsWith("data:image/svg+xml;base64,")).toBe(true);
    
    // Decode and verify SVG structure
    const base64 = svgDataUrl.replace("data:image/svg+xml;base64,", "");
    const svgString = atob(base64);
    
    expect(svgString).toContain('<svg');
    expect(svgString).toContain('<foreignObject');
    expect(svgString).toContain('Test');
  });

  it("should process multiple frames in parallel", async () => {
    const pool = getSerializationWorkerPool();
    
    // Skip test if workers not available
    if (!pool || !pool.isAvailable()) {
      console.log("Skipping test - workers not available");
      return;
    }

    const frames = [
      '<div>Frame 1</div>',
      '<div>Frame 2</div>',
      '<div>Frame 3</div>',
      '<div>Frame 4</div>',
      '<div>Frame 5</div>',
      '<div>Frame 6</div>',
      '<div>Frame 7</div>',
      '<div>Frame 8</div>',
    ];

    const startTime = performance.now();

    // Kick off all serialization tasks in parallel
    const promises = frames.map((htmlString) =>
      pool.serializeFrame(htmlString, [], 100, 100)
    );

    // Wait for all to complete
    const results = await Promise.all(promises);
    
    const elapsedTime = performance.now() - startTime;

    // All results should be valid
    expect(results.length).toBe(frames.length);
    results.forEach((svgDataUrl, index) => {
      expect(svgDataUrl).toBeTruthy();
      expect(svgDataUrl.startsWith("data:image/svg+xml;base64,")).toBe(true);
      
      const base64 = svgDataUrl.replace("data:image/svg+xml;base64,", "");
      const svgString = atob(base64);
      expect(svgString).toContain(`Frame ${index + 1}`);
    });

    console.log(`[SerializationWorkerPool] Processed ${frames.length} frames in ${elapsedTime.toFixed(2)}ms (${(elapsedTime / frames.length).toFixed(2)}ms per frame)`);
  });

  it("should handle canvas encoding in workers", async () => {
    const pool = getSerializationWorkerPool();
    
    // Skip test if workers not available
    if (!pool || !pool.isAvailable()) {
      console.log("Skipping test - workers not available");
      return;
    }

    // Create a simple ImageData (red square)
    const size = 50;
    const imageData = new ImageData(size, size);
    for (let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i] = 255;     // R
      imageData.data[i + 1] = 0;   // G
      imageData.data[i + 2] = 0;   // B
      imageData.data[i + 3] = 255; // A
    }

    const htmlString = '<div><canvas data-canvas-id="canvas-0" width="50" height="50"></canvas></div>';
    const canvases = [{
      id: 'canvas-0',
      imageData,
      width: size,
      height: size,
      preserveAlpha: false
    }];

    const svgDataUrl = await pool.serializeFrame(htmlString, canvases, 100, 100);
    
    expect(svgDataUrl).toBeTruthy();
    expect(svgDataUrl.startsWith("data:image/svg+xml;base64,")).toBe(true);
    
    // Decode and verify the canvas was replaced with an img
    const base64 = svgDataUrl.replace("data:image/svg+xml;base64,", "");
    const svgString = atob(base64);
    
    // Should have img tag, not canvas tag
    expect(svgString).toContain('<img');
    expect(svgString).toContain('src="data:image/jpeg');
    expect(svgString).not.toContain('<canvas');
  });
});
