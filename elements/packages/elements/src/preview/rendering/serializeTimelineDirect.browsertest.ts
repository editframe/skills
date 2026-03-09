/**
 * Tests for direct timeline serialization.
 * Validates XHTML/SVG output for various element types.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { html, render as litRender } from "lit";
import { serializeElementToXHTML, captureTimelineToDataUri } from "./serializeTimelineDirect.js";
import { EFTimegroup } from "../../elements/EFTimegroup.js";
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
      expect(middleSegment?.segmentText).toBe(" ");

      // Serialize to XHTML
      const xhtml = await serializeElementToXHTML(text, 800, 600, {
        canvasScale: 1,
        timeMs: 0,
      });

      // Should contain both words in the serialized output
      expect(xhtml).toContain("Hello");
      expect(xhtml).toContain("World");
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
      const svgContent = atob(dataUri.substring("data:image/svg+xml;base64,".length));

      // Parse and check text content is preserved
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgContent, "image/svg+xml");
      const textContent = svgDoc.documentElement.textContent || "";

      // Should have both words present
      expect(textContent).toContain("Free");
      expect(textContent).toContain("Admission");
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
      expect(xhtml).toContain("A");
      expect(xhtml).toContain("B");
      expect(xhtml).toContain("C");
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
      expect(xhtml).toContain("H");
      expect(xhtml).toContain("i");
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
      expect(xhtml).toContain("width:1920px");
      expect(xhtml).toContain("height:1080px");
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
      const doc = parser.parseFromString(
        `<div xmlns="http://www.w3.org/1999/xhtml">${xhtml}</div>`,
        "text/xml",
      );

      // Find all span/div elements that contain the segment text
      const allElements = doc.querySelectorAll("*");
      const segmentContainers: Element[] = [];
      for (const el of allElements) {
        const style = el.getAttribute("style") || "";
        // Segment containers are the innermost styled elements containing word text
        if (el.textContent?.trim() === "SARAH" || el.textContent?.trim() === "CHEN!") {
          if (style && el.children.length === 0) {
            segmentContainers.push(el);
          }
        }
      }

      // Word segments should NOT be serialized as display:block
      // They should be display:inline (the natural :host display value)
      for (const container of segmentContainers) {
        const style = container.getAttribute("style") || "";
        expect(style).not.toContain("display:block");
        expect(style).toContain("display:inline");
      }

      // Additionally, word segments should be <span> tags, not <div> tags
      for (const container of segmentContainers) {
        expect(container.tagName.toLowerCase()).toBe("span");
      }
    });
  });

  describe("animated text serialization fidelity", () => {
    it("should not serialize width on inline/inline-block text containers that would constrain content flow", async () => {
      // Reproduce the TemplatedRenderingDemo layout:
      // flex column container with centered items, ef-text with word split + animation
      const wrapper = document.createElement("div");
      wrapper.style.display = "flex";
      wrapper.style.flexDirection = "column";
      wrapper.style.alignItems = "center";
      wrapper.style.justifyContent = "center";
      wrapper.style.textAlign = "center";
      wrapper.style.width = "960px";
      wrapper.style.height = "540px";
      wrapper.style.backgroundColor = "#333";

      const text = document.createElement("ef-text") as EFText;
      text.split = "word";
      text.setAttribute("stagger", "100ms");
      text.textContent = "Sarah Chen!";
      text.style.fontSize = "48px";
      text.style.fontWeight = "900";
      text.style.color = "white";
      text.style.textTransform = "uppercase";
      text.style.letterSpacing = "-0.025em";
      // Simulate animation to trigger inline-block on segments
      text.style.animationName = "tmpl-slide-up";
      text.style.animationDuration = "0.5s";
      text.style.animationFillMode = "both";

      wrapper.appendChild(text);
      container.appendChild(wrapper);
      await text.updateComplete;
      await text.whenSegmentsReady();

      // After animation propagation, verify segments got inline-block
      const segments = text.segments;
      const nonWhitespaceSegments = segments.filter((s) => !/^\s+$/.test(s.segmentText));
      for (const seg of nonWhitespaceSegments) {
        expect(getComputedStyle(seg).display).toBe("inline-block");
      }

      // Serialize
      const xhtml = await serializeElementToXHTML(wrapper, 960, 540, {
        canvasScale: 1,
        timeMs: 0,
      });

      // Parse and check: inline-block segments should NOT have explicit width
      // that could constrain text if font metrics differ slightly in foreignObject
      const parser = new DOMParser();
      const doc = parser.parseFromString(
        `<div xmlns="http://www.w3.org/1999/xhtml">${xhtml}</div>`,
        "text/xml",
      );

      const allEls = doc.querySelectorAll("*");
      for (const el of allEls) {
        const content = el.textContent?.trim();
        if ((content === "Sarah" || content === "Chen!") && el.children.length === 0) {
          const style = el.getAttribute("style") || "";
          // Check: inline-block text segments should have width:auto, not a pixel value
          // A pixel width on the segment container forces text to fit that exact width,
          // which breaks when foreignObject renders with different font metrics.
          const widthMatch = style.match(/(?:^|;)\s*width:([^;]+)/);
          if (widthMatch) {
            const widthVal = widthMatch[1]!.trim();
            // Width should be 'auto', not a specific pixel value
            expect(widthVal).toBe("auto");
          }
        }
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
      expect(xhtml).toContain("gap:");
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
      expect(xhtml).toContain("font-family:");
      expect(xhtml).toContain("font-size:");
      expect(xhtml).toContain("font-weight:");
    });
  });

  describe("sequence visibility at end boundary", () => {
    async function renderSequenceTimegroup(child1Text: string, child2Text: string) {
      const wrapper = document.createElement("div");
      litRender(
        html`
        <ef-timegroup mode="sequence" style="width:800px;height:600px">
          <ef-text duration="1s">${child1Text}</ef-text>
          <ef-text duration="1s">${child2Text}</ef-text>
        </ef-timegroup>
      `,
        wrapper,
      );
      container.appendChild(wrapper);
      await customElements.whenDefined("ef-timegroup");
      const timegroup = wrapper.querySelector("ef-timegroup");
      if (!(timegroup instanceof EFTimegroup)) {
        throw new Error(`Expected EFTimegroup instance`);
      }
      return timegroup;
    }

    it("should not serialize the first sequence child at its end boundary when a second child begins", async () => {
      const timegroup = await renderSequenceTimegroup("FIRST_SCENE", "SECOND_SCENE");

      await timegroup.updateComplete;
      await timegroup.waitForMediaDurations();

      // Seek to the exact end boundary of child1 / start of child2 (1000ms)
      // updateAnimations should mark child1 as invisible (exclusive end for mid-composition elements)
      await timegroup.seek(1000);

      // Serialize at the same time
      const xhtml = await serializeElementToXHTML(timegroup, 800, 600, {
        canvasScale: 1,
        timeMs: 1000,
      });

      // The first child should NOT appear in the serialized output.
      // It has ended and the second child has begun.
      expect(xhtml).not.toContain("FIRST_SCENE");
      expect(xhtml).toContain("SECOND_SCENE");
    });

    it("should not serialize an ended sequence child when rendering past its end time", async () => {
      const timegroup = await renderSequenceTimegroup("SCENE_ALPHA", "SCENE_BETA");

      await timegroup.updateComplete;
      await timegroup.waitForMediaDurations();

      // Seek to 1500ms - well into second child's range
      await timegroup.seek(1500);

      const xhtml = await serializeElementToXHTML(timegroup, 800, 600, {
        canvasScale: 1,
        timeMs: 1500,
      });

      // The first child (0-1000ms) must not appear at 1500ms
      expect(xhtml).not.toContain("SCENE_ALPHA");
      expect(xhtml).toContain("SCENE_BETA");
    });
  });

  describe("nested timegroup sequence (HeroDemo pattern)", () => {
    async function renderNestedSequence() {
      const wrapper = document.createElement("div");
      litRender(
        html`
        <ef-timegroup mode="sequence" style="width:960px;height:540px">
          <ef-timegroup mode="fixed" duration="2s" style="width:960px;height:540px">
            <div class="scene1-content">SCENE_ONE_CONTENT</div>
          </ef-timegroup>
          <ef-timegroup mode="fixed" duration="2s" style="width:960px;height:540px">
            <div class="scene2-content">SCENE_TWO_CONTENT</div>
          </ef-timegroup>
          <ef-timegroup mode="fixed" duration="2s" style="width:960px;height:540px">
            <div class="scene3-content">SCENE_THREE_CONTENT</div>
          </ef-timegroup>
        </ef-timegroup>
      `,
        wrapper,
      );
      container.appendChild(wrapper);
      await customElements.whenDefined("ef-timegroup");
      const timegroup = wrapper.querySelector("ef-timegroup");
      if (!(timegroup instanceof EFTimegroup)) {
        throw new Error(`Expected EFTimegroup instance`);
      }
      return timegroup;
    }

    /** Build sequence via JS properties (how React sets them) instead of HTML attributes */
    async function renderNestedSequenceViaProperties() {
      const root = document.createElement("ef-timegroup") as EFTimegroup;
      root.mode = "sequence";
      root.style.cssText = "width:960px;height:540px";

      const scenes = [
        ["SCENE_ONE_CONTENT", "scene1-content"],
        ["SCENE_TWO_CONTENT", "scene2-content"],
        ["SCENE_THREE_CONTENT", "scene3-content"],
      ];
      for (const [label, cls] of scenes) {
        const child = document.createElement("ef-timegroup") as EFTimegroup;
        child.mode = "fixed";
        child.duration = "2s";
        child.style.cssText = "width:960px;height:540px";
        const div = document.createElement("div");
        div.className = cls!;
        div.textContent = label!;
        child.appendChild(div);
        root.appendChild(child);
      }

      container.appendChild(root);
      await root.updateComplete;
      return root;
    }

    it("should only serialize scene2 when seeked to scene2 time range", async () => {
      const root = await renderNestedSequence();
      await root.updateComplete;
      await root.waitForMediaDurations();

      // Scene1: 0-2000ms, Scene2: 2000-4000ms, Scene3: 4000-6000ms
      // Seek to 3000ms (middle of scene2)
      await root.seek(3000);

      const xhtml = await serializeElementToXHTML(root, 960, 540, {
        canvasScale: 1,
        timeMs: 3000,
      });

      expect(xhtml).not.toContain("SCENE_ONE_CONTENT");
      expect(xhtml).toContain("SCENE_TWO_CONTENT");
      expect(xhtml).not.toContain("SCENE_THREE_CONTENT");
    });

    it("should only serialize scene2 at the exact boundary between scene1 and scene2", async () => {
      const root = await renderNestedSequence();
      await root.updateComplete;
      await root.waitForMediaDurations();

      // At exactly 2000ms: scene1 ends, scene2 begins
      await root.seek(2000);

      const xhtml = await serializeElementToXHTML(root, 960, 540, {
        canvasScale: 1,
        timeMs: 2000,
      });

      expect(xhtml).not.toContain("SCENE_ONE_CONTENT");
      expect(xhtml).toContain("SCENE_TWO_CONTENT");
      expect(xhtml).not.toContain("SCENE_THREE_CONTENT");
    });

    it("should transition correctly through all scenes using seekForRender", async () => {
      const root = await renderNestedSequence();
      await root.updateComplete;
      await root.waitForMediaDurations();

      // Simulate the export pipeline: seek through multiple frames sequentially
      const frameTimes = [0, 1000, 2000, 3000, 4000, 5000];
      const results: string[] = [];

      for (const timeMs of frameTimes) {
        await root.seekForRender(timeMs);

        const xhtml = await serializeElementToXHTML(root, 960, 540, {
          canvasScale: 1,
          timeMs,
        });
        results.push(xhtml);
      }

      // Frame at 0ms: scene1 visible
      expect(results[0]).toContain("SCENE_ONE_CONTENT");
      expect(results[0]).not.toContain("SCENE_TWO_CONTENT");

      // Frame at 1000ms: scene1 visible (midway)
      expect(results[1]).toContain("SCENE_ONE_CONTENT");
      expect(results[1]).not.toContain("SCENE_TWO_CONTENT");

      // Frame at 2000ms: scene2 visible (scene1 ended)
      expect(results[2]).not.toContain("SCENE_ONE_CONTENT");
      expect(results[2]).toContain("SCENE_TWO_CONTENT");

      // Frame at 3000ms: scene2 visible (midway)
      expect(results[3]).not.toContain("SCENE_ONE_CONTENT");
      expect(results[3]).toContain("SCENE_TWO_CONTENT");

      // Frame at 4000ms: scene3 visible (scene2 ended)
      expect(results[4]).not.toContain("SCENE_TWO_CONTENT");
      expect(results[4]).toContain("SCENE_THREE_CONTENT");

      // Frame at 5000ms: scene3 visible (midway)
      expect(results[5]).not.toContain("SCENE_TWO_CONTENT");
      expect(results[5]).toContain("SCENE_THREE_CONTENT");
    });

    it("should transition correctly through scenes on a render clone", async () => {
      const root = await renderNestedSequence();
      await root.updateComplete;
      await root.waitForMediaDurations();

      // Use the actual render clone path — this is what the export pipeline does
      const { clone, cleanup } = await root.createRenderClone();

      try {
        // Verify clone setup: no playbackController, correct structure
        expect(clone.playbackController).toBeUndefined();

        const childTGs = Array.from(clone.querySelectorAll("ef-timegroup")) as any[];
        expect(childTGs.length).toBe(3);

        const frameTimes = [0, 1000, 2000, 3000, 4000, 5000];
        const results: string[] = [];

        for (const timeMs of frameTimes) {
          await clone.seekForRender(timeMs);

          const xhtml = await serializeElementToXHTML(clone, 960, 540, {
            canvasScale: 1,
            timeMs,
          });
          results.push(xhtml);
        }

        // Frame at 0ms: scene1 visible
        expect(results[0]).toContain("SCENE_ONE_CONTENT");
        expect(results[0]).not.toContain("SCENE_TWO_CONTENT");

        // Frame at 1000ms: scene1 visible (midway)
        expect(results[1]).toContain("SCENE_ONE_CONTENT");
        expect(results[1]).not.toContain("SCENE_TWO_CONTENT");

        // Frame at 2000ms: scene2 visible (scene1 ended)
        expect(results[2]).not.toContain("SCENE_ONE_CONTENT");
        expect(results[2]).toContain("SCENE_TWO_CONTENT");

        // Frame at 3000ms: scene2 visible (midway)
        expect(results[3]).not.toContain("SCENE_ONE_CONTENT");
        expect(results[3]).toContain("SCENE_TWO_CONTENT");

        // Frame at 4000ms: scene3 visible (scene2 ended)
        expect(results[4]).not.toContain("SCENE_TWO_CONTENT");
        expect(results[4]).toContain("SCENE_THREE_CONTENT");

        // Frame at 5000ms: scene3 visible (midway)
        expect(results[5]).not.toContain("SCENE_TWO_CONTENT");
        expect(results[5]).toContain("SCENE_THREE_CONTENT");
      } finally {
        cleanup();
      }
    });

    it("should preserve mode/overlapMs on render clone when set as JS properties", async () => {
      const root = await renderNestedSequenceViaProperties();
      await root.waitForMediaDurations();

      const { clone, cleanup } = await root.createRenderClone();

      try {
        expect(clone.mode).toBe("sequence");

        const childTGs = Array.from(clone.querySelectorAll("ef-timegroup")) as EFTimegroup[];
        expect(childTGs.length).toBe(3);

        // Children should have sequential startTimeMs, not all 0
        expect(childTGs[0]!.startTimeMs).toBe(0);
        expect(childTGs[0]!.endTimeMs).toBe(2000);
        expect(childTGs[1]!.startTimeMs).toBe(2000);
        expect(childTGs[1]!.endTimeMs).toBe(4000);
        expect(childTGs[2]!.startTimeMs).toBe(4000);
        expect(childTGs[2]!.endTimeMs).toBe(6000);

        const frameTimes = [0, 1000, 2000, 3000, 4000, 5000];
        const results: string[] = [];

        for (const timeMs of frameTimes) {
          await clone.seekForRender(timeMs);
          const xhtml = await serializeElementToXHTML(clone, 960, 540, {
            canvasScale: 1,
            timeMs,
          });
          results.push(xhtml);
        }

        // Frame at 0ms: scene1 visible
        expect(results[0]).toContain("SCENE_ONE_CONTENT");
        expect(results[0]).not.toContain("SCENE_TWO_CONTENT");

        // Frame at 2000ms: scene2 visible (scene1 ended)
        expect(results[2]).not.toContain("SCENE_ONE_CONTENT");
        expect(results[2]).toContain("SCENE_TWO_CONTENT");

        // Frame at 4000ms: scene3 visible
        expect(results[4]).not.toContain("SCENE_TWO_CONTENT");
        expect(results[4]).toContain("SCENE_THREE_CONTENT");
      } finally {
        cleanup();
      }
    });

    it("should transition correctly after re-parenting clone (renderTimegroupToVideo pattern)", async () => {
      const root = await renderNestedSequence();
      await root.updateComplete;
      await root.waitForMediaDurations();

      const { clone, cleanup } = await root.createRenderClone();

      try {
        // Re-parent clone into a new container (simulates renderTimegroupToVideo)
        const newContainer = document.createElement("div");
        newContainer.style.cssText =
          "position:fixed;left:-99999px;top:-99999px;pointer-events:none;";
        newContainer.appendChild(clone); // RE-PARENT: moves clone from its original container
        document.body.appendChild(newContainer);

        void clone.offsetHeight;

        const frameTimes = [0, 1000, 2000, 3000, 4000, 5000];
        const results: string[] = [];

        for (const timeMs of frameTimes) {
          await clone.seekForRender(timeMs);

          const xhtml = await serializeElementToXHTML(clone, 960, 540, {
            canvasScale: 1,
            timeMs,
          });
          results.push(xhtml);
        }

        // Frame at 0ms: scene1 visible
        expect(results[0]).toContain("SCENE_ONE_CONTENT");
        expect(results[0]).not.toContain("SCENE_TWO_CONTENT");

        // Frame at 2000ms: scene2 visible (scene1 ended)
        expect(results[2]).not.toContain("SCENE_ONE_CONTENT");
        expect(results[2]).toContain("SCENE_TWO_CONTENT");

        // Frame at 4000ms: scene3 visible
        expect(results[4]).not.toContain("SCENE_TWO_CONTENT");
        expect(results[4]).toContain("SCENE_THREE_CONTENT");
      } finally {
        cleanup();
      }
    });

    it("should transition correctly with overlap using seekForRender", async () => {
      const overlapMs = 500;
      const wrapper = document.createElement("div");
      litRender(
        html`
        <ef-timegroup mode="sequence" overlap="${overlapMs}ms" style="width:960px;height:540px">
          <ef-timegroup mode="fixed" duration="2s" style="width:960px;height:540px">
            <div class="scene1-content">SCENE_ONE_CONTENT</div>
          </ef-timegroup>
          <ef-timegroup mode="fixed" duration="2s" style="width:960px;height:540px">
            <div class="scene2-content">SCENE_TWO_CONTENT</div>
          </ef-timegroup>
          <ef-timegroup mode="fixed" duration="2s" style="width:960px;height:540px">
            <div class="scene3-content">SCENE_THREE_CONTENT</div>
          </ef-timegroup>
        </ef-timegroup>
      `,
        wrapper,
      );
      container.appendChild(wrapper);
      await customElements.whenDefined("ef-timegroup");
      const root = wrapper.querySelector("ef-timegroup") as EFTimegroup;
      await root.updateComplete;
      await root.waitForMediaDurations();

      // With 500ms overlap: Scene1 0-2000, Scene2 1500-3500, Scene3 3000-5000
      // Both scenes visible during overlap windows
      const frameTimes = [0, 750, 1500, 1750, 2000, 2500, 3000, 3250, 3500, 4000];
      const results: string[] = [];

      for (const timeMs of frameTimes) {
        await root.seekForRender(timeMs);
        const xhtml = await serializeElementToXHTML(root, 960, 540, {
          canvasScale: 1,
          timeMs,
        });
        results.push(xhtml);
      }

      // Frame 0ms: only scene1
      expect(results[0]).toContain("SCENE_ONE_CONTENT");
      expect(results[0]).not.toContain("SCENE_TWO_CONTENT");

      // Frame 750ms: only scene1 (before overlap)
      expect(results[1]).toContain("SCENE_ONE_CONTENT");
      expect(results[1]).not.toContain("SCENE_TWO_CONTENT");

      // Frame 1500ms: overlap — both scene1 and scene2 visible
      expect(results[2]).toContain("SCENE_ONE_CONTENT");
      expect(results[2]).toContain("SCENE_TWO_CONTENT");

      // Frame 1750ms: overlap — both scene1 and scene2
      expect(results[3]).toContain("SCENE_ONE_CONTENT");
      expect(results[3]).toContain("SCENE_TWO_CONTENT");

      // Frame 2000ms: scene1 ended, only scene2
      expect(results[4]).not.toContain("SCENE_ONE_CONTENT");
      expect(results[4]).toContain("SCENE_TWO_CONTENT");

      // Frame 2500ms: only scene2
      expect(results[5]).not.toContain("SCENE_ONE_CONTENT");
      expect(results[5]).toContain("SCENE_TWO_CONTENT");

      // Frame 3000ms: overlap — both scene2 and scene3
      expect(results[6]).toContain("SCENE_TWO_CONTENT");
      expect(results[6]).toContain("SCENE_THREE_CONTENT");

      // Frame 3250ms: overlap — both scene2 and scene3
      expect(results[7]).toContain("SCENE_TWO_CONTENT");
      expect(results[7]).toContain("SCENE_THREE_CONTENT");

      // Frame 3500ms: scene2 ended, only scene3
      expect(results[8]).not.toContain("SCENE_TWO_CONTENT");
      expect(results[8]).toContain("SCENE_THREE_CONTENT");

      // Frame 4000ms: only scene3
      expect(results[9]).not.toContain("SCENE_TWO_CONTENT");
      expect(results[9]).toContain("SCENE_THREE_CONTENT");
    });
  });
});
