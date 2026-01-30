/**
 * Tests for direct timeline serialization.
 * Validates XHTML/SVG output for various element types.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { serializeElementToXHTML, serializeTimelineToDataUri } from "./serializeTimelineDirect.js";
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
    it("should use non-breaking spaces for whitespace-only segments", async () => {
      // Create ef-text with word splitting
      const text = document.createElement("ef-text") as EFText;
      text.split = "word";
      text.textContent = "Hello World";
      
      container.appendChild(text);
      await text.updateComplete;
      await text.whenSegmentsReady();
      
      // Serialize to XHTML
      const xhtml = await serializeElementToXHTML(text, 800, 600, {
        canvasScale: 1,
        timeMs: 0,
      });
      
      // Should contain non-breaking space entity for whitespace segments
      expect(xhtml).toContain('&#160;');
      
      // Count segments - should have "Hello", " ", "World"
      const segments = text.segments;
      expect(segments.length).toBe(3);
      
      // Verify middle segment is whitespace
      const middleSegment = segments[1];
      expect(middleSegment?.segmentText).toBe(' ');
    });

    it("should preserve whitespace in rendered SVG foreignObject", async () => {
      const text = document.createElement("ef-text") as EFText;
      text.split = "word";
      text.textContent = "Free Admission";
      text.style.fontSize = "24px";
      
      container.appendChild(text);
      await text.updateComplete;
      await text.whenSegmentsReady();
      
      // Serialize to data URI (full SVG)
      const dataUri = await serializeTimelineToDataUri(text, 800, 600, {
        canvasScale: 1,
        timeMs: 0,
      });
      
      // Decode SVG
      const svgContent = atob(dataUri.substring('data:image/svg+xml;base64,'.length));
      
      // Should have non-breaking spaces in the SVG
      expect(svgContent).toContain('&#160;');
      
      // Parse and check text content is preserved
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
      const textContent = svgDoc.documentElement.textContent || '';
      
      // Should have space between words (non-breaking space)
      expect(textContent).toContain('Free');
      expect(textContent).toContain('Admission');
      // Non-breaking space renders as regular space in textContent
      expect(textContent.replace(/\s+/g, ' ').trim()).toBe('Free Admission');
    });

    it("should handle multiple whitespace segments correctly", async () => {
      const text = document.createElement("ef-text") as EFText;
      text.split = "word";
      text.textContent = "A B C";
      
      container.appendChild(text);
      await text.updateComplete;
      await text.whenSegmentsReady();
      
      const xhtml = await serializeElementToXHTML(text, 800, 600, {
        canvasScale: 1,
        timeMs: 0,
      });
      
      // Should have 5 segments: "A", " ", "B", " ", "C"
      const segments = text.segments;
      expect(segments.length).toBe(5);
      
      // Count non-breaking spaces - should be 2
      const nbspCount = (xhtml.match(/&#160;/g) || []).length;
      expect(nbspCount).toBe(2);
    });

    it("should preserve xml:space and flex-shrink on whitespace segments", async () => {
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
      
      // Should have xml:space="preserve" on whitespace segments
      expect(xhtml).toContain('xml:space="preserve"');
      
      // Should have flex-shrink:0 to prevent collapse
      expect(xhtml).toContain('flex-shrink:0');
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
      
      const xhtml = await serializeElementToXHTML(text, 800, 600, {
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
