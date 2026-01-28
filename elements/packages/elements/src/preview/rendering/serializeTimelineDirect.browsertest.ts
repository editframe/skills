/**
 * Tests for direct timeline serialization.
 * Validates XHTML/SVG output for various element types.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { serializeTimelineToXHTML } from "./serializeTimelineDirect.js";
import type { EFTimegroup } from "../../elements/EFTimegroup.js";
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
    it("should preserve whitespace between word-split segments", async () => {
      // Create ef-text with word splitting
      const text = document.createElement("ef-text") as EFText;
      text.split = "word";
      text.textContent = "Hello World Test";
      
      container.appendChild(text);
      await text.updateComplete;
      
      // Wait for segments to be ready
      await text.whenSegmentsReady();
      
      // Serialize
      const xhtml = await serializeTimelineToXHTML(text, 800, 600, {
        canvasScale: 1,
        timeMs: 0,
      });
      
      // Check that whitespace is preserved in output
      // Should contain the actual space characters or whitespace segments
      console.log("Serialized XHTML:", xhtml);
      
      // Verify whitespace segments are present
      expect(xhtml).toContain(" ");
      
      // Count segments - should have 5: "Hello", " ", "World", " ", "Test"
      const segmentMatches = xhtml.match(/<span[^>]*>/g) || [];
      console.log(`Found ${segmentMatches.length} span elements`);
      expect(segmentMatches.length).toBeGreaterThanOrEqual(5);
    });

    it("should serialize whitespace-only segments with xml:space preserve", async () => {
      const text = document.createElement("ef-text") as EFText;
      text.split = "word";
      text.textContent = "A B";
      
      container.appendChild(text);
      await text.updateComplete;
      await text.whenSegmentsReady();
      
      const xhtml = await serializeTimelineToXHTML(text, 800, 600, {
        canvasScale: 1,
        timeMs: 0,
      });
      
      console.log("Serialized XHTML with whitespace:", xhtml);
      
      // Should have xml:space="preserve" on whitespace segments
      expect(xhtml).toContain('xml:space="preserve"');
      
      // Should have flex-shrink:0 to prevent collapse
      expect(xhtml).toContain('flex-shrink:0');
    });

    it("should use span elements for inline-block text segments", async () => {
      const text = document.createElement("ef-text") as EFText;
      text.split = "char";
      text.textContent = "Hi";
      
      container.appendChild(text);
      await text.updateComplete;
      await text.whenSegmentsReady();
      
      const xhtml = await serializeTimelineToXHTML(text, 800, 600, {
        canvasScale: 1,
        timeMs: 0,
      });
      
      console.log("Char-split XHTML:", xhtml);
      
      // Text segments should be serialized as spans (inline elements)
      const spanCount = (xhtml.match(/<span/g) || []).length;
      expect(spanCount).toBeGreaterThan(0);
      
      // Should have display:inline-block preserved
      expect(xhtml).toContain('inline-block');
    });
  });

  describe("timegroup serialization", () => {
    it("should serialize a basic timegroup with dimensions", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      timegroup.style.width = "1920px";
      timegroup.style.height = "1080px";
      
      container.appendChild(timegroup);
      await timegroup.updateComplete;
      
      const xhtml = await serializeTimelineToXHTML(timegroup, 1920, 1080, {
        canvasScale: 1,
        timeMs: 0,
      });
      
      console.log("Timegroup XHTML:", xhtml);
      
      // Should have XHTML namespace
      expect(xhtml).toContain('xmlns="http://www.w3.org/1999/xhtml"');
      
      // Should have wrapper with correct dimensions
      expect(xhtml).toContain('width:1920px');
      expect(xhtml).toContain('height:1080px');
    });
  });

  describe("style serialization", () => {
    it("should serialize computed styles including flex properties", async () => {
      const text = document.createElement("ef-text") as EFText;
      text.split = "word";
      text.textContent = "Flex Test";
      text.style.display = "inline-flex";
      text.style.gap = "10px";
      
      container.appendChild(text);
      await text.updateComplete;
      await text.whenSegmentsReady();
      
      const xhtml = await serializeTimelineToXHTML(text, 800, 600, {
        canvasScale: 1,
        timeMs: 0,
      });
      
      console.log("Flex styles XHTML:", xhtml);
      
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
      
      const xhtml = await serializeTimelineToXHTML(text, 800, 600, {
        canvasScale: 1,
        timeMs: 0,
      });
      
      console.log("Font properties XHTML:", xhtml);
      
      // Should have individual font properties
      expect(xhtml).toContain('font-family:');
      expect(xhtml).toContain('font-size:');
      expect(xhtml).toContain('font-weight:');
    });
  });
});
