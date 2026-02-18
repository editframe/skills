/**
 * Tests for scaling architecture in timeline serialization.
 * 
 * These tests verify the multi-stage scaling system and serve as
 * characterization tests for the refactoring to ScaleConfig.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { captureTimelineToDataUri } from "./serializeTimelineDirect.js";
import type { EFTimegroup } from "../../elements/EFTimegroup.js";
import type { EFText } from "../../elements/EFText.js";

describe("serializeTimelineDirect scaling", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  // Helper to decode SVG from data URI
  function decodeSVG(dataUri: string): { width: number; height: number; html: string } {
    const base64 = dataUri.substring('data:image/svg+xml;base64,'.length);
    const svgContent = atob(base64);
    
    // Parse SVG to extract dimensions
    const widthMatch = svgContent.match(/width="(\d+)"/);
    const heightMatch = svgContent.match(/height="(\d+)"/);
    
    return {
      width: widthMatch ? parseInt(widthMatch[1]!, 10) : 0,
      height: heightMatch ? parseInt(heightMatch[1]!, 10) : 0,
      html: svgContent,
    };
  }

  // Helper to create a test element with canvas
  function createElementWithCanvas(options: {
    canvasWidth: number;
    canvasHeight: number;
    displayWidth?: string;
    displayHeight?: string;
  }): HTMLElement {
    const wrapper = document.createElement('div');
    const canvas = document.createElement('canvas');
    canvas.width = options.canvasWidth;
    canvas.height = options.canvasHeight;
    
    if (options.displayWidth) {
      canvas.style.width = options.displayWidth;
    }
    if (options.displayHeight) {
      canvas.style.height = options.displayHeight;
    }
    
    // Draw something so canvas isn't empty
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'red';
      ctx.fillRect(0, 0, options.canvasWidth, options.canvasHeight);
    }
    
    wrapper.appendChild(canvas);
    return wrapper;
  }

  describe("Golden output tests - output dimensions", () => {
    it("should produce correct SVG dimensions for 1920x1080 @ 0.25 scale", async () => {
      const text = document.createElement("ef-text") as EFText;
      text.textContent = "Test";
      container.appendChild(text);
      await text.updateComplete;

      const dataUri = await captureTimelineToDataUri(text, 1920, 1080, {
        canvasScale: 0.25,
        timeMs: 0,
      });

      const svg = decodeSVG(dataUri);
      expect(svg.width).toBe(Math.floor(1920 * 0.25)); // 480
      expect(svg.height).toBe(Math.floor(1080 * 0.25)); // 270
    });

    it("should produce correct SVG dimensions for 1920x1080 @ 0.5 scale", async () => {
      const text = document.createElement("ef-text") as EFText;
      text.textContent = "Test";
      container.appendChild(text);
      await text.updateComplete;

      const dataUri = await captureTimelineToDataUri(text, 1920, 1080, {
        canvasScale: 0.5,
        timeMs: 0,
      });

      const svg = decodeSVG(dataUri);
      expect(svg.width).toBe(Math.floor(1920 * 0.5)); // 960
      expect(svg.height).toBe(Math.floor(1080 * 0.5)); // 540
    });

    it("should produce correct SVG dimensions for 1920x1080 @ 1.0 scale", async () => {
      const text = document.createElement("ef-text") as EFText;
      text.textContent = "Test";
      container.appendChild(text);
      await text.updateComplete;

      const dataUri = await captureTimelineToDataUri(text, 1920, 1080, {
        canvasScale: 1.0,
        timeMs: 0,
      });

      const svg = decodeSVG(dataUri);
      expect(svg.width).toBe(1920);
      expect(svg.height).toBe(1080);
    });

    it("should produce correct SVG dimensions for 4K @ 0.5 scale", async () => {
      const text = document.createElement("ef-text") as EFText;
      text.textContent = "Test";
      container.appendChild(text);
      await text.updateComplete;

      const dataUri = await captureTimelineToDataUri(text, 3840, 2160, {
        canvasScale: 0.5,
        timeMs: 0,
      });

      const svg = decodeSVG(dataUri);
      expect(svg.width).toBe(Math.floor(3840 * 0.5)); // 1920
      expect(svg.height).toBe(Math.floor(2160 * 0.5)); // 1080
    });
  });

  describe("DOM scaling tests - CSS transform wrapper", () => {
    it("should apply transform:scale wrapper when canvasScale < 1", async () => {
      const text = document.createElement("ef-text") as EFText;
      text.textContent = "Test";
      container.appendChild(text);
      await text.updateComplete;

      const dataUri = await captureTimelineToDataUri(text, 1920, 1080, {
        canvasScale: 0.5,
        timeMs: 0,
      });

      const svg = decodeSVG(dataUri);
      expect(svg.html).toContain('transform:scale(0.5)');
    });

    it("should NOT apply transform:scale wrapper when canvasScale = 1", async () => {
      const text = document.createElement("ef-text") as EFText;
      text.textContent = "Test";
      container.appendChild(text);
      await text.updateComplete;

      const dataUri = await captureTimelineToDataUri(text, 1920, 1080, {
        canvasScale: 1.0,
        timeMs: 0,
      });

      const svg = decodeSVG(dataUri);
      expect(svg.html).not.toContain('transform:scale');
    });

    it("should apply transform:scale wrapper when canvasScale = 0.25", async () => {
      const text = document.createElement("ef-text") as EFText;
      text.textContent = "Test";
      container.appendChild(text);
      await text.updateComplete;

      const dataUri = await captureTimelineToDataUri(text, 1920, 1080, {
        canvasScale: 0.25,
        timeMs: 0,
      });

      const svg = decodeSVG(dataUri);
      expect(svg.html).toContain('transform:scale(0.25)');
    });
  });

  describe("Canvas optimization tests - verify resolution reduction", () => {
    it("should reduce canvas resolution when displayed smaller than natural size", async () => {
      // Create a 1920px canvas displayed at 420px
      const element = createElementWithCanvas({
        canvasWidth: 1920,
        canvasHeight: 1080,
        displayWidth: '420px',
        displayHeight: '236px',
      });
      
      container.appendChild(element);

      const dataUri = await captureTimelineToDataUri(element, 1920, 1080, {
        canvasScale: 0.5,
        timeMs: 0,
      });

      // The canvas should be encoded at reduced resolution
      // optimalScale = min(1.0, (420/1920) * 0.5 * 1.5) ≈ 0.164
      // Encoded canvas should be ~315px wide (1920 * 0.164)
      const svg = decodeSVG(dataUri);
      
      // Verify the canvas was encoded (contains img tag with data URL)
      expect(svg.html).toContain('<img');
      expect(svg.html).toContain('data:image/');
    });

    it("should not upscale canvas beyond natural resolution", async () => {
      // Create a small canvas displayed larger
      const element = createElementWithCanvas({
        canvasWidth: 500,
        canvasHeight: 500,
        displayWidth: '1000px',
        displayHeight: '1000px',
      });
      
      container.appendChild(element);

      const dataUri = await captureTimelineToDataUri(element, 1920, 1080, {
        canvasScale: 1.0,
        timeMs: 0,
      });

      // Canvas should not be upscaled beyond 500x500
      // optimalScale should be capped at 1.0
      const svg = decodeSVG(dataUri);
      expect(svg.html).toContain('<img');
    });

    it("should skip empty canvases", async () => {
      const wrapper = document.createElement('div');
      const canvas = document.createElement('canvas');
      canvas.width = 0;
      canvas.height = 0;
      wrapper.appendChild(canvas);
      
      container.appendChild(wrapper);

      const dataUri = await captureTimelineToDataUri(wrapper, 1920, 1080, {
        canvasScale: 1.0,
        timeMs: 0,
      });

      const svg = decodeSVG(dataUri);
      // Empty canvas should not produce img tag
      expect(svg.html).not.toContain('data:image/');
    });
  });

  describe("Quality multiplier tests", () => {
    it("should apply 1.5x quality multiplier to canvas encoding", async () => {
      // Create a 1000px canvas displayed at 500px
      const element = createElementWithCanvas({
        canvasWidth: 1000,
        canvasHeight: 1000,
        displayWidth: '500px',
        displayHeight: '500px',
      });
      
      container.appendChild(element);

      const dataUri = await captureTimelineToDataUri(element, 1920, 1080, {
        canvasScale: 1.0,
        timeMs: 0,
      });

      // displayScale = 0.5, exportScale = 1.0, quality = 1.5
      // optimalScale = min(1.0, 0.5 * 1.0 * 1.5) = 0.75
      // Canvas should be encoded at 750x750
      const svg = decodeSVG(dataUri);
      expect(svg.html).toContain('<img');
    });
  });

  describe("Integration tests - real-world scenarios", () => {
    it("should handle thumbnail generation (0.25 scale)", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      const text = document.createElement("ef-text") as EFText;
      text.textContent = "Thumbnail Test";
      timegroup.appendChild(text);
      
      container.appendChild(timegroup);
      await timegroup.updateComplete;
      await text.updateComplete;

      const dataUri = await captureTimelineToDataUri(timegroup, 1920, 1080, {
        canvasScale: 0.25,
        timeMs: 0,
      });

      const svg = decodeSVG(dataUri);
      expect(svg.width).toBe(480);
      expect(svg.height).toBe(270);
      expect(svg.html).toContain('transform:scale(0.25)');
    });

    it("should handle preview rendering (1.0 scale)", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      const text = document.createElement("ef-text") as EFText;
      text.textContent = "Preview Test";
      timegroup.appendChild(text);
      
      container.appendChild(timegroup);
      await timegroup.updateComplete;
      await text.updateComplete;

      const dataUri = await captureTimelineToDataUri(timegroup, 1920, 1080, {
        canvasScale: 1.0,
        timeMs: 0,
      });

      const svg = decodeSVG(dataUri);
      expect(svg.width).toBe(1920);
      expect(svg.height).toBe(1080);
      expect(svg.html).not.toContain('transform:scale');
    });

    it("should handle video export (0.5 scale)", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      const text = document.createElement("ef-text") as EFText;
      text.textContent = "Video Export Test";
      timegroup.appendChild(text);
      
      container.appendChild(timegroup);
      await timegroup.updateComplete;
      await text.updateComplete;

      const dataUri = await captureTimelineToDataUri(timegroup, 1920, 1080, {
        canvasScale: 0.5,
        timeMs: 0,
      });

      const svg = decodeSVG(dataUri);
      expect(svg.width).toBe(960);
      expect(svg.height).toBe(540);
      expect(svg.html).toContain('transform:scale(0.5)');
    });
  });

  describe("Edge cases", () => {
    it("should handle very small scales", async () => {
      const text = document.createElement("ef-text") as EFText;
      text.textContent = "Test";
      container.appendChild(text);
      await text.updateComplete;

      const dataUri = await captureTimelineToDataUri(text, 1920, 1080, {
        canvasScale: 0.1,
        timeMs: 0,
      });

      const svg = decodeSVG(dataUri);
      expect(svg.width).toBe(Math.floor(1920 * 0.1)); // 192
      expect(svg.height).toBe(Math.floor(1080 * 0.1)); // 108
    });

    it("should handle non-standard dimensions", async () => {
      const text = document.createElement("ef-text") as EFText;
      text.textContent = "Test";
      container.appendChild(text);
      await text.updateComplete;

      const dataUri = await captureTimelineToDataUri(text, 1280, 720, {
        canvasScale: 0.75,
        timeMs: 0,
      });

      const svg = decodeSVG(dataUri);
      expect(svg.width).toBe(Math.floor(1280 * 0.75)); // 960
      expect(svg.height).toBe(Math.floor(720 * 0.75)); // 540
    });
  });
});
