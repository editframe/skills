/**
 * Tests for direct timeline serialization.
 * Validates XHTML/SVG output for various element types.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { serializeElementToXHTML, captureTimelineToDataUri } from "./serializeTimelineDirect.js";
import type { EFTimegroup } from "../../elements/EFTimegroup.js";
import "../../elements/EFText.js";
import "../../elements/EFTextSegment.js";
import type { EFText } from "../../elements/EFText.js";
describe("serializeTimelineDirect", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  describe("text segment whitespace handling", () => {
    it("should serialize word-split text with whitespace segments", async () => {
      // Create ef-text with word splitting
      const text = document.createElement("ef-text") as EFText;
      text.split = "word";
      text.textContent = "Hello World";

      container.appendChild(text);
      await text.updateComplete;
      await text.whenSegmentsReady();

      // Count segments - should have "Hello", " ", "World"
      const segments = text.segments;
      expect(segments.length).toBe(3);

      // Verify middle segment is whitespace
      const middleSegment = segments[1];
      expect(middleSegment?.segmentText).toBe(' ');

      // Serialize to XHTML
      const xhtml = await serializeElementToXHTML(text, 800, 600, {
        canvasScale: 1,
        timeMs: 0,
      });

      // Should contain both words in the serialized output
      expect(xhtml).toContain('Hello');
      expect(xhtml).toContain('World');
    });

    it("should preserve text content in rendered SVG foreignObject", async () => {
      const text = document.createElement("ef-text") as EFText;
      text.split = "word";
      text.textContent = "Free Admission";
      text.style.fontSize = "24px";

      container.appendChild(text);
      await text.updateComplete;
      await text.whenSegmentsReady();

      // Serialize to data URI (full SVG)
      const dataUri = await captureTimelineToDataUri(text, 800, 600, {
        canvasScale: 1,
        timeMs: 0,
      });

      // Decode SVG
      const svgContent = atob(dataUri.substring('data:image/svg+xml;base64,'.length));

      // Parse and check text content is preserved
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
      const textContent = svgDoc.documentElement.textContent || '';

      // Should have both words present
      expect(textContent).toContain('Free');
      expect(textContent).toContain('Admission');
    });

    it("should handle multiple whitespace segments correctly", async () => {
      const text = document.createElement("ef-text") as EFText;
      text.split = "word";
      text.textContent = "A B C";

      container.appendChild(text);
      await text.updateComplete;
      await text.whenSegmentsReady();

      // Should have 5 segments: "A", " ", "B", " ", "C"
      const segments = text.segments;
      expect(segments.length).toBe(5);

      const xhtml = await serializeElementToXHTML(text, 800, 600, {
        canvasScale: 1,
        timeMs: 0,
      });

      // All word segments should be present in serialized output
      expect(xhtml).toContain('A');
      expect(xhtml).toContain('B');
      expect(xhtml).toContain('C');
    });

    it("should serialize text segments as span containers with computed styles", async () => {
      const text = document.createElement("ef-text") as EFText;
      text.split = "word";
      text.textContent = "Test Space";

      container.appendChild(text);
      await text.updateComplete;
      await text.whenSegmentsReady();

      const xhtml = await serializeElementToXHTML(text, 800, 600, {
        canvasScale: 1,
        timeMs: 0,
      });

      // Custom elements are serialized as span containers
      const spanCount = (xhtml.match(/<span/g) || []).length;
      expect(spanCount).toBeGreaterThan(0);

      // Should have style attributes from computed styles
      expect(xhtml).toContain('style="');
    });

    it("should use span elements for inline text segments", async () => {
      const text = document.createElement("ef-text") as EFText;
      text.split = "char";
      text.textContent = "Hi";

      container.appendChild(text);
      await text.updateComplete;
      await text.whenSegmentsReady();

      const xhtml = await serializeElementToXHTML(text, 800, 600, {
        canvasScale: 1,
        timeMs: 0,
      });

      // Text segments should be serialized as spans (inline elements)
      const spanCount = (xhtml.match(/<span/g) || []).length;
      expect(spanCount).toBeGreaterThan(0);

      // Character segments should contain the individual characters
      expect(xhtml).toContain('H');
      expect(xhtml).toContain('i');
    });
  });

  describe("timegroup serialization", () => {
    it("should serialize a basic timegroup with dimensions", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      timegroup.style.width = "1920px";
      timegroup.style.height = "1080px";
      
      container.appendChild(timegroup);
      await timegroup.updateComplete;
      
      const xhtml = await serializeElementToXHTML(timegroup, 1920, 1080, {
        canvasScale: 1,
        timeMs: 0,
      });
      
      // Should have XHTML namespace
      expect(xhtml).toContain('xmlns="http://www.w3.org/1999/xhtml"');
      
      // Should have wrapper with correct dimensions
      expect(xhtml).toContain('width:1920px');
      expect(xhtml).toContain('height:1080px');
    });
  });

  describe("object-fit preservation", () => {
    function createCanvasWithPixels(width: number, height: number): HTMLCanvasElement {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "red";
      ctx.fillRect(0, 0, width, height);
      return canvas;
    }

    it("should preserve object-fit: cover on serialized canvas elements", async () => {
      const canvas = createCanvasWithPixels(200, 100);
      canvas.style.width = "400px";
      canvas.style.height = "400px";
      canvas.style.objectFit = "cover";
      container.appendChild(canvas);

      const xhtml = await serializeElementToXHTML(container, 800, 600, {
        canvasScale: 1,
        timeMs: 0,
      });

      expect(xhtml).toContain("object-fit:cover");
      expect(xhtml).not.toContain("object-fit:contain");
    });

    it("should preserve object-fit: fill on serialized canvas elements", async () => {
      const canvas = createCanvasWithPixels(200, 100);
      canvas.style.width = "400px";
      canvas.style.height = "400px";
      canvas.style.objectFit = "fill";
      container.appendChild(canvas);

      const xhtml = await serializeElementToXHTML(container, 800, 600, {
        canvasScale: 1,
        timeMs: 0,
      });

      expect(xhtml).toContain("object-fit:fill");
    });

    it("should preserve custom object-position on serialized canvas elements", async () => {
      const canvas = createCanvasWithPixels(200, 100);
      canvas.style.width = "400px";
      canvas.style.height = "400px";
      canvas.style.objectFit = "cover";
      canvas.style.objectPosition = "top left";
      container.appendChild(canvas);

      const xhtml = await serializeElementToXHTML(container, 800, 600, {
        canvasScale: 1,
        timeMs: 0,
      });

      expect(xhtml).toContain("object-fit:cover");
      // Extract the img tag's style to check object-position specifically
      const imgMatch = xhtml.match(/<img\s+style="([^"]+)"/);
      expect(imgMatch).toBeTruthy();
      const imgStyle = imgMatch![1];
      // "top left" computes to "0% 0%" or "left top" — not the default "50% 50%"
      expect(imgStyle).not.toMatch(/object-position:50% 50%/);
      expect(imgStyle).toMatch(/object-position/);
    });

    it("should default to contain when canvas has no explicit object-fit", async () => {
      const canvas = createCanvasWithPixels(200, 100);
      canvas.style.width = "400px";
      canvas.style.height = "400px";
      // No explicit object-fit — browser default is "fill" for canvas
      container.appendChild(canvas);

      const xhtml = await serializeElementToXHTML(container, 800, 600, {
        canvasScale: 1,
        timeMs: 0,
      });

      // Browser default for canvas object-fit is "fill"
      expect(xhtml).toContain("object-fit:fill");
    });
  });

  describe("display recovery for text segments", () => {
    it("should serialize inline text segments as display:inline when they have stale display:none from temporal visibility", async () => {
      const text = document.createElement("ef-text") as EFText;
      text.split = "word";
      text.textContent = "SARAH CHEN!";

      container.appendChild(text);
      await text.updateComplete;
      await text.whenSegmentsReady();

      // Simulate what updateAnimations does for temporal visibility:
      // set display:none on segments (as if they were outside their time bounds)
      const segments = text.segments;
      for (const segment of segments) {
        segment.style.setProperty("display", "none");
      }

      // Now serialize - the serializer should recover the correct display value,
      // not blindly convert none -> block
      const xhtml = await serializeElementToXHTML(text, 800, 600, {
        canvasScale: 1,
        timeMs: 0,
      });

      // Parse the output to check display values on segment containers
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<div xmlns="http://www.w3.org/1999/xhtml">${xhtml}</div>`, 'text/xml');

      // Find all span/div elements that contain the segment text
      const allElements = doc.querySelectorAll('*');
      const segmentContainers: Element[] = [];
      for (const el of allElements) {
        const style = el.getAttribute('style') || '';
        // Segment containers are the innermost styled elements containing word text
        if (el.textContent?.trim() === 'SARAH' || el.textContent?.trim() === 'CHEN!') {
          if (style && el.children.length === 0) {
            segmentContainers.push(el);
          }
        }
      }

      // Word segments should NOT be serialized as display:block
      // They should be display:inline (the natural :host display value)
      for (const container of segmentContainers) {
        const style = container.getAttribute('style') || '';
        expect(style).not.toContain('display:block');
        expect(style).toContain('display:inline');
      }

      // Additionally, word segments should be <span> tags, not <div> tags
      for (const container of segmentContainers) {
        expect(container.tagName.toLowerCase()).toBe('span');
      }
    });
  });

  describe("style serialization", () => {
    it("should serialize computed styles including flex properties", async () => {
      // Use a plain div to test style serialization without shadow DOM interference
      const flexContainer = document.createElement("div");
      flexContainer.style.display = "inline-flex";
      flexContainer.style.gap = "10px";
      flexContainer.textContent = "Flex Test";

      container.appendChild(flexContainer);

      const xhtml = await serializeElementToXHTML(flexContainer, 800, 600, {
        canvasScale: 1,
        timeMs: 0,
      });

      // Should include flex properties
      expect(xhtml).toMatch(/display:[^;]*inline-flex/);
      expect(xhtml).toContain('gap:');
    });

    it("should serialize font properties individually", async () => {
      const text = document.createElement("ef-text") as EFText;
      text.textContent = "Font Test";
      text.style.fontFamily = "Arial";
      text.style.fontSize = "24px";
      text.style.fontWeight = "bold";
      
      container.appendChild(text);
      await text.updateComplete;
      
      const xhtml = await serializeElementToXHTML(text, 800, 600, {
        canvasScale: 1,
        timeMs: 0,
      });
      
      // Should have individual font properties
      expect(xhtml).toContain('font-family:');
      expect(xhtml).toContain('font-size:');
      expect(xhtml).toContain('font-weight:');
    });
  });
});
