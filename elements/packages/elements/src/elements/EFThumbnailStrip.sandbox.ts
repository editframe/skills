import { defineSandbox } from "../sandbox/index.js";
import { html } from "lit";
import type { EFThumbnailStrip } from "./EFThumbnailStrip.js";
import type { EFTimegroup } from "./EFTimegroup.js";
import type { EFVideo } from "./EFVideo.js";
import { thumbnailImageCache } from "./EFThumbnailStrip.js";
import "./EFThumbnailStrip.js";
import "./EFTimegroup.js";
import "./EFVideo.js";

// Test video URL - public URL that's reliably available
const TEST_VIDEO_SRC = "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

/**
 * Helper to create a test context wrapper.
 * EFTimegroup checks for ancestor <test-context> to skip workbench auto-wrapping.
 */
function createTestContext(): HTMLElement {
  const testContext = document.createElement("test-context");
  testContext.style.display = "contents";
  return testContext;
}

/**
 * Helper to create a video element for thumbnail strip targeting.
 */
function createVideo(id: string, options: {
  src?: string;
  width?: number;
  height?: number;
  mode?: "asset" | "playback";
} = {}): EFVideo {
  const {
    src = TEST_VIDEO_SRC,
    width = 320,
    height = 180,
    mode = "asset",
  } = options;

  const video = document.createElement("ef-video") as EFVideo;
  video.id = id;
  video.setAttribute("src", src);
  video.setAttribute("mode", mode);
  video.style.width = `${width}px`;
  video.style.height = `${height}px`;
  video.style.display = "block";
  
  return video;
}

/**
 * Helper to create a timegroup with mixed video and DOM content.
 */
function createMixedContentTimegroup(id: string, options: {
  durationMs?: number;
  width?: number;
  height?: number;
  videoSrc?: string;
} = {}): EFTimegroup {
  const {
    durationMs = 5000,
    width = 320,
    height = 180,
    videoSrc = TEST_VIDEO_SRC,
  } = options;

  const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
  timegroup.id = id;
  timegroup.setAttribute("mode", "fixed");
  timegroup.setAttribute("duration", `${durationMs}ms`);
  timegroup.style.width = `${width}px`;
  timegroup.style.height = `${height}px`;
  timegroup.style.display = "block";
  timegroup.style.position = "relative";
  
  // Mix video content with DOM overlay
  timegroup.innerHTML = `
    <ef-video src="${videoSrc}" mode="asset" style="width: 100%; height: 100%; object-fit: cover; position: absolute; top: 0; left: 0;"></ef-video>
    <div style="position: absolute; bottom: 10px; left: 10px; right: 10px; background: rgba(0,0,0,0.7); color: white; padding: 8px; font-size: 14px; font-family: system-ui; border-radius: 4px;">
      Overlay Text on Video
    </div>
  `;
  
  return timegroup;
}

/**
 * Helper to create a timegroup with visible content for thumbnail capture.
 * Returns just the elements needed - no timeline/workbench wrappers.
 */
function createTimegroup(id: string, options: {
  durationMs?: number;
  width?: number;
  height?: number;
  background?: string;
  content?: string;
} = {}): EFTimegroup {
  const {
    durationMs = 5000,
    width = 320,
    height = 180,
    background = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    content = "Test Content",
  } = options;

  const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
  timegroup.id = id;
  timegroup.setAttribute("mode", "fixed");
  timegroup.setAttribute("duration", `${durationMs}ms`);
  timegroup.style.width = `${width}px`;
  timegroup.style.height = `${height}px`;
  timegroup.style.background = background;
  timegroup.style.display = "flex";
  timegroup.style.alignItems = "center";
  timegroup.style.justifyContent = "center";
  timegroup.style.color = "white";
  timegroup.style.fontSize = "24px";
  timegroup.style.fontFamily = "system-ui";
  timegroup.innerHTML = `<div>${content}</div>`;
  
  return timegroup;
}

/**
 * Helper to create a scrollable container for testing scroll behavior.
 * The strip is placed inside and made wider than the viewport.
 */
function createScrollContainer(options: {
  viewportWidth?: number;
  contentWidth?: number;
  height?: number;
} = {}): HTMLElement {
  const {
    viewportWidth = 400,
    contentWidth = 2000,
    height = 60,
  } = options;

  const scrollContainer = document.createElement("div");
  scrollContainer.style.width = `${viewportWidth}px`;
  scrollContainer.style.height = `${height}px`;
  scrollContainer.style.overflowX = "auto";
  scrollContainer.style.overflowY = "hidden";
  scrollContainer.style.position = "relative";

  // Inner content div that's wider than viewport
  const content = document.createElement("div");
  content.style.width = `${contentWidth}px`;
  content.style.height = "100%";
  content.style.position = "relative";
  
  scrollContainer.appendChild(content);
  
  return scrollContainer;
}

/**
 * Helper to create a thumbnail strip targeting an element by ID.
 */
function createThumbnailStrip(targetId: string, options: {
  width?: number;
  height?: number;
  pixelsPerMs?: number;
  startTimeMs?: number;
  endTimeMs?: number;
  useIntrinsicDuration?: boolean;
} = {}): EFThumbnailStrip {
  const {
    width = 400,
    height = 48,
    pixelsPerMs,
    startTimeMs,
    endTimeMs,
    useIntrinsicDuration,
  } = options;

  const strip = document.createElement("ef-thumbnail-strip") as EFThumbnailStrip;
  strip.setAttribute("target", targetId);
  strip.style.width = `${width}px`;
  strip.style.height = `${height}px`;
  strip.style.display = "block";
  strip.style.position = "relative";
  
  if (pixelsPerMs !== undefined) {
    strip.setAttribute("pixels-per-ms", String(pixelsPerMs));
  }
  if (startTimeMs !== undefined) {
    strip.setAttribute("start-time-ms", String(startTimeMs));
  }
  if (endTimeMs !== undefined) {
    strip.setAttribute("end-time-ms", String(endTimeMs));
  }
  if (useIntrinsicDuration) {
    strip.setAttribute("use-intrinsic-duration", "true");
  }
  
  return strip;
}

/**
 * Helper to check if canvas has non-transparent pixels (actual content rendered)
 */
function canvasHasContent(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return false;
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 3; i < imageData.data.length; i += 4) {
    const alpha = imageData.data[i];
    if (alpha !== undefined && alpha > 0) {
      return true;
    }
  }
  return false;
}

/**
 * Helper to wait for thumbnail strip to complete rendering
 */
async function waitForThumbnails(
  strip: EFThumbnailStrip,
  ctx: { frame: () => Promise<void>; wait: (ms: number) => Promise<void> }
) {
  // @ts-expect-error accessing private property for testing
  if (strip.thumbnailLayoutTask) {
    // @ts-expect-error accessing private property for testing
    await strip.thumbnailLayoutTask.taskComplete.catch(() => {});
  }
  await ctx.frame();
  await ctx.wait(500);
  await ctx.frame();
}

export default defineSandbox({
  name: "EFThumbnailStrip",
  description: "Canvas-based thumbnail strip for ef-video and ef-timegroup elements",
  
  render: () => html`
    <test-context style="display: contents;">
      <div style="display: flex; flex-direction: column; gap: 16px; padding: 20px;">
        <ef-timegroup id="demo-timegroup" mode="fixed" duration="5s" 
          style="width: 320px; height: 180px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 24px;">
          <div>Demo Content</div>
        </ef-timegroup>
        <ef-thumbnail-strip
          target="demo-timegroup"
          style="width: 400px; height: 48px;"
        ></ef-thumbnail-strip>
      </div>
    </test-context>
  `,

  setup: async () => {
    await thumbnailImageCache.clear();
  },
  
  scenarios: {
    // ============================================
    // Target Resolution
    // ============================================
    
    async "resolves timegroup target by ID"(ctx) {
      const container = ctx.getContainer();
      const testContext = createTestContext();
      container.appendChild(testContext);
      
      const timegroup = createTimegroup("tg-resolve");
      const strip = createThumbnailStrip("tg-resolve");
      
      testContext.appendChild(timegroup);
      testContext.appendChild(strip);
      
      await timegroup.updateComplete;
      await strip.updateComplete;
      await ctx.frame();
      
      // Verify target attribute
      ctx.expect(strip.target).toBe("tg-resolve");
      
      // Force target controller to re-resolve
      strip.setAttribute("target", "");
      await strip.updateComplete;
      strip.setAttribute("target", "tg-resolve");
      await strip.updateComplete;
      await ctx.frame();
      
      ctx.expect(strip.targetElement).toBe(timegroup);
    },
    
    async "handles missing target gracefully"(ctx) {
      const container = ctx.getContainer();
      const testContext = createTestContext();
      container.appendChild(testContext);
      
      const strip = createThumbnailStrip("nonexistent-element");
      testContext.appendChild(strip);
      
      await strip.updateComplete;
      await ctx.frame();
      await ctx.wait(100);
      
      // Should not crash
      ctx.expect(strip.targetElement).toBeUndefined();
      
      // Canvas should still exist (empty/placeholder state)
      const canvas = strip.shadowRoot?.querySelector("canvas");
      ctx.expect(canvas).toBeDefined();
    },
    
    // ============================================
    // Canvas Rendering
    // ============================================
    
    async "renders canvas with correct dimensions"(ctx) {
      const container = ctx.getContainer();
      const testContext = createTestContext();
      container.appendChild(testContext);
      
      const timegroup = createTimegroup("tg-canvas");
      const strip = createThumbnailStrip("tg-canvas", { width: 500, height: 60 });
      
      testContext.appendChild(timegroup);
      testContext.appendChild(strip);
      
      await timegroup.updateComplete;
      await strip.updateComplete;
      await ctx.frame();
      await ctx.wait(100);
      
      const canvas = strip.shadowRoot?.querySelector("canvas");
      ctx.expect(canvas).toBeDefined();
      ctx.expect(canvas!.width).toBeGreaterThan(0);
      ctx.expect(canvas!.height).toBeGreaterThan(0);
    },
    
    async "renders thumbnails from timegroup content"(ctx) {
      const container = ctx.getContainer();
      const testContext = createTestContext();
      container.appendChild(testContext);
      
      const timegroup = createTimegroup("tg-render");
      const strip = createThumbnailStrip("tg-render");
      
      testContext.appendChild(timegroup);
      testContext.appendChild(strip);
      
      await timegroup.updateComplete;
      await strip.updateComplete;
      await waitForThumbnails(strip, ctx);
      
      const canvas = strip.shadowRoot?.querySelector("canvas");
      ctx.expect(canvas).toBeDefined();
      ctx.expect(canvasHasContent(canvas!)).toBe(true);
    },
    
    async "updates dimensions on resize"(ctx) {
      const container = ctx.getContainer();
      const testContext = createTestContext();
      container.appendChild(testContext);
      
      const timegroup = createTimegroup("tg-resize");
      const strip = createThumbnailStrip("tg-resize", { width: 300 });
      
      testContext.appendChild(timegroup);
      testContext.appendChild(strip);
      
      await timegroup.updateComplete;
      await waitForThumbnails(strip, ctx);
      
      // Resize the strip
      strip.style.width = "600px";
      
      // Wait for ResizeObserver
      await ctx.frame();
      await ctx.wait(300);
      await ctx.frame();
      
      const canvas = strip.shadowRoot?.querySelector("canvas");
      ctx.expect(canvas).toBeDefined();
      ctx.expect(canvas!.width).toBeGreaterThan(0);
    },
    
    // ============================================
    // Time Range Properties
    // ============================================
    
    async "respects start-time-ms and end-time-ms"(ctx) {
      const container = ctx.getContainer();
      const testContext = createTestContext();
      container.appendChild(testContext);
      
      const timegroup = createTimegroup("tg-timerange", { durationMs: 10000 });
      const strip = createThumbnailStrip("tg-timerange", {
        startTimeMs: 2000,
        endTimeMs: 8000,
      });
      
      testContext.appendChild(timegroup);
      testContext.appendChild(strip);
      
      await timegroup.updateComplete;
      await strip.updateComplete;
      await ctx.frame();
      
      ctx.expect(strip.startTimeMs).toBe(2000);
      ctx.expect(strip.endTimeMs).toBe(8000);
    },
    
    async "respects use-intrinsic-duration attribute"(ctx) {
      const container = ctx.getContainer();
      const testContext = createTestContext();
      container.appendChild(testContext);
      
      const timegroup = createTimegroup("tg-intrinsic");
      const strip = createThumbnailStrip("tg-intrinsic", { useIntrinsicDuration: true });
      
      testContext.appendChild(timegroup);
      testContext.appendChild(strip);
      
      await timegroup.updateComplete;
      await strip.updateComplete;
      await ctx.frame();
      
      ctx.expect(strip.useIntrinsicDuration).toBe(true);
      
      // Toggle off
      strip.setAttribute("use-intrinsic-duration", "false");
      await strip.updateComplete;
      
      ctx.expect(strip.useIntrinsicDuration).toBe(false);
    },
    
    async "parses use-intrinsic-duration string values correctly"(ctx) {
      const container = ctx.getContainer();
      const testContext = createTestContext();
      container.appendChild(testContext);
      
      const timegroup = createTimegroup("tg-parse");
      const strip = createThumbnailStrip("tg-parse");
      
      testContext.appendChild(timegroup);
      testContext.appendChild(strip);
      
      await strip.updateComplete;
      
      // Default is false
      ctx.expect(strip.useIntrinsicDuration).toBe(false);
      
      // "true" string -> true
      strip.setAttribute("use-intrinsic-duration", "true");
      await strip.updateComplete;
      ctx.expect(strip.useIntrinsicDuration).toBe(true);
      
      // "false" string -> false (not truthy!)
      strip.setAttribute("use-intrinsic-duration", "false");
      await strip.updateComplete;
      ctx.expect(strip.useIntrinsicDuration).toBe(false);
    },
    
    // ============================================
    // Edge Cases
    // ============================================
    
    async "handles zero duration timegroup"(ctx) {
      const container = ctx.getContainer();
      const testContext = createTestContext();
      container.appendChild(testContext);
      
      const timegroup = createTimegroup("tg-zero", { durationMs: 0 });
      const strip = createThumbnailStrip("tg-zero");
      
      testContext.appendChild(timegroup);
      testContext.appendChild(strip);
      
      await timegroup.updateComplete;
      await strip.updateComplete;
      await ctx.frame();
      await ctx.wait(200);
      
      // Should not crash
      const canvas = strip.shadowRoot?.querySelector("canvas");
      ctx.expect(canvas).toBeDefined();
    },
    
    async "handles very short duration"(ctx) {
      const container = ctx.getContainer();
      const testContext = createTestContext();
      container.appendChild(testContext);
      
      const timegroup = createTimegroup("tg-short", { durationMs: 100 });
      const strip = createThumbnailStrip("tg-short");
      
      testContext.appendChild(timegroup);
      testContext.appendChild(strip);
      
      await timegroup.updateComplete;
      await waitForThumbnails(strip, ctx);
      
      const canvas = strip.shadowRoot?.querySelector("canvas");
      ctx.expect(canvas).toBeDefined();
      // Should still render something
      ctx.expect(canvasHasContent(canvas!)).toBe(true);
    },
    
    async "handles very long duration"(ctx) {
      const container = ctx.getContainer();
      const testContext = createTestContext();
      container.appendChild(testContext);
      
      // 10 minute duration
      const timegroup = createTimegroup("tg-long", { durationMs: 600000 });
      const strip = createThumbnailStrip("tg-long", { width: 800 });
      
      testContext.appendChild(timegroup);
      testContext.appendChild(strip);
      
      await timegroup.updateComplete;
      await strip.updateComplete;
      await ctx.frame();
      await ctx.wait(200);
      
      const canvas = strip.shadowRoot?.querySelector("canvas");
      ctx.expect(canvas).toBeDefined();
      
      // Canvas should be virtualized (not full duration width)
      const dpr = window.devicePixelRatio || 1;
      const maxExpectedWidth = (800 + 800) * dpr; // viewport + padding
      ctx.expect(canvas!.width).toBeLessThanOrEqual(maxExpectedWidth);
    },
    
    // ============================================
    // Cache Behavior
    // ============================================
    
    async "caches thumbnails in memory"(ctx) {
      const container = ctx.getContainer();
      const testContext = createTestContext();
      container.appendChild(testContext);
      
      const timegroup = createTimegroup("tg-cache");
      const strip = createThumbnailStrip("tg-cache");
      
      testContext.appendChild(timegroup);
      testContext.appendChild(strip);
      
      await timegroup.updateComplete;
      await waitForThumbnails(strip, ctx);
      await ctx.wait(500); // Extra time for cache writes
      
      const stats = await thumbnailImageCache.getStats();
      ctx.expect(stats.itemCount).toBeGreaterThan(0);
    },
    
    async "reuses cached thumbnails on re-render"(ctx) {
      const container = ctx.getContainer();
      const testContext = createTestContext();
      container.appendChild(testContext);
      
      const timegroup = createTimegroup("tg-cache-reuse");
      const strip = createThumbnailStrip("tg-cache-reuse");
      
      testContext.appendChild(timegroup);
      testContext.appendChild(strip);
      
      await timegroup.updateComplete;
      await waitForThumbnails(strip, ctx);
      await ctx.wait(500);
      
      const initialStats = await thumbnailImageCache.getStats();
      const initialCount = initialStats.itemCount;
      
      // Force re-render
      // @ts-expect-error accessing private method
      strip.runThumbnailUpdate();
      await waitForThumbnails(strip, ctx);
      
      // Cache count should stay the same (reused, not duplicated)
      const finalStats = await thumbnailImageCache.getStats();
      ctx.expect(finalStats.itemCount).toBe(initialCount);
    },
    
    async "regenerates after cache clear"(ctx) {
      const container = ctx.getContainer();
      const testContext = createTestContext();
      container.appendChild(testContext);
      
      const timegroup = createTimegroup("tg-cache-clear");
      const strip = createThumbnailStrip("tg-cache-clear");
      
      testContext.appendChild(timegroup);
      testContext.appendChild(strip);
      
      await timegroup.updateComplete;
      await waitForThumbnails(strip, ctx);
      
      // Verify canvas has content
      const canvas = strip.shadowRoot?.querySelector("canvas");
      ctx.expect(canvasHasContent(canvas!)).toBe(true);
      
      // Clear cache
      await thumbnailImageCache.clear();
      const clearedStats = await thumbnailImageCache.getStats();
      ctx.expect(clearedStats.itemCount).toBe(0);
      
      // Trigger re-render
      // @ts-expect-error accessing private method
      strip.runThumbnailUpdate();
      await waitForThumbnails(strip, ctx);
      
      // Should still have content after regeneration
      ctx.expect(canvasHasContent(canvas!)).toBe(true);
    },
    
    // ============================================
    // Scroll & Virtual Rendering
    // ============================================
    
    async "attaches to scrollable parent container"(ctx) {
      const container = ctx.getContainer();
      const testContext = createTestContext();
      container.appendChild(testContext);
      
      // Create timegroup (hidden, just for targeting)
      const timegroup = createTimegroup("tg-scroll-attach", { durationMs: 30000 });
      timegroup.style.display = "none";
      testContext.appendChild(timegroup);
      
      // Create scrollable container with strip inside
      const scrollContainer = createScrollContainer({ viewportWidth: 400, contentWidth: 3000 });
      testContext.appendChild(scrollContainer);
      
      const strip = createThumbnailStrip("tg-scroll-attach", { width: 3000 });
      scrollContainer.querySelector("div")!.appendChild(strip);
      
      await timegroup.updateComplete;
      await strip.updateComplete;
      await ctx.frame();
      await ctx.wait(100);
      
      // Strip should have found and attached to the scroll container
      // @ts-expect-error accessing private property
      ctx.expect(strip._scrollContainer).toBe(scrollContainer);
    },
    
    async "redraws on scroll within container"(ctx) {
      const container = ctx.getContainer();
      const testContext = createTestContext();
      container.appendChild(testContext);
      
      const timegroup = createTimegroup("tg-scroll-redraw", { durationMs: 30000 });
      timegroup.style.display = "none";
      testContext.appendChild(timegroup);
      
      const scrollContainer = createScrollContainer({ viewportWidth: 400, contentWidth: 3000 });
      testContext.appendChild(scrollContainer);
      
      const strip = createThumbnailStrip("tg-scroll-redraw", { width: 3000 });
      scrollContainer.querySelector("div")!.appendChild(strip);
      
      await timegroup.updateComplete;
      await waitForThumbnails(strip, ctx);
      
      // Get initial scroll position
      // @ts-expect-error accessing private property
      const initialScrollLeft = strip._currentScrollLeft;
      ctx.expect(initialScrollLeft).toBe(0);
      
      // Scroll the container
      scrollContainer.scrollLeft = 500;
      
      // Dispatch scroll event (scrollLeft alone doesn't trigger listener in some cases)
      scrollContainer.dispatchEvent(new Event("scroll"));
      await ctx.frame();
      await ctx.wait(100);
      
      // Strip should have updated its scroll position
      // @ts-expect-error accessing private property
      ctx.expect(strip._currentScrollLeft).toBe(500);
    },
    
    async "virtualizes canvas based on scroll container viewport"(ctx) {
      // Virtual rendering should work with any scroll container, not just timelines
      const container = ctx.getContainer();
      const testContext = createTestContext();
      container.appendChild(testContext);
      
      // Very long duration = very wide strip
      const timegroup = createTimegroup("tg-virtual-scroll", { durationMs: 600000 }); // 10 minutes
      timegroup.style.display = "none";
      testContext.appendChild(timegroup);
      
      // Scroll container with 400px viewport, but strip is 60000px wide
      const scrollContainer = createScrollContainer({ viewportWidth: 400, contentWidth: 60000 });
      testContext.appendChild(scrollContainer);
      
      const strip = createThumbnailStrip("tg-virtual-scroll", { width: 60000, pixelsPerMs: 0.1 });
      scrollContainer.querySelector("div")!.appendChild(strip);
      
      await timegroup.updateComplete;
      await strip.updateComplete;
      await ctx.frame();
      await ctx.wait(200);
      
      const canvas = strip.shadowRoot?.querySelector("canvas");
      ctx.expect(canvas).toBeDefined();
      
      // Canvas should be virtualized based on scroll container's viewport (400px)
      // NOT the full strip width (60000px)
      // Expected: viewport (400) + 2*padding (800) = 1200px max
      const dpr = window.devicePixelRatio || 1;
      const maxExpectedWidth = (400 + 800) * dpr; // viewport + 2*padding
      ctx.expect(canvas!.width).toBeLessThanOrEqual(maxExpectedWidth);
      ctx.expect(canvas!.width).toBeGreaterThan(0);
    },
    
    async "renders visible thumbnails only"(ctx) {
      const container = ctx.getContainer();
      const testContext = createTestContext();
      container.appendChild(testContext);
      
      const timegroup = createTimegroup("tg-visible", { durationMs: 30000 });
      timegroup.style.display = "none";
      testContext.appendChild(timegroup);
      
      const scrollContainer = createScrollContainer({ viewportWidth: 400, contentWidth: 3000 });
      testContext.appendChild(scrollContainer);
      
      const strip = createThumbnailStrip("tg-visible", { width: 3000 });
      scrollContainer.querySelector("div")!.appendChild(strip);
      
      await timegroup.updateComplete;
      await waitForThumbnails(strip, ctx);
      
      // Check that we have cached thumbnails for the visible region
      // @ts-expect-error accessing private property
      const cachedThumbnails = strip._cachedThumbnails;
      ctx.expect(cachedThumbnails.length).toBeGreaterThan(0);
      
      // Thumbnails should have x positions starting near 0 (initial scroll)
      const minX = Math.min(...cachedThumbnails.map((t: { x: number }) => t.x));
      ctx.expect(minX).toBeLessThan(100); // Should start near the beginning
    },
    
    async "tracks scroll position for redraw calculations"(ctx) {
      const container = ctx.getContainer();
      const testContext = createTestContext();
      container.appendChild(testContext);
      
      const timegroup = createTimegroup("tg-scroll-track", { durationMs: 60000 });
      timegroup.style.display = "none";
      testContext.appendChild(timegroup);
      
      const scrollContainer = createScrollContainer({ viewportWidth: 400, contentWidth: 6000 });
      testContext.appendChild(scrollContainer);
      
      const strip = createThumbnailStrip("tg-scroll-track", { width: 6000 });
      scrollContainer.querySelector("div")!.appendChild(strip);
      
      await timegroup.updateComplete;
      await waitForThumbnails(strip, ctx);
      
      // Record initial scroll position
      // @ts-expect-error accessing private property
      const initialScrollLeft = strip._currentScrollLeft;
      ctx.expect(initialScrollLeft).toBe(0);
      
      // Scroll to middle
      scrollContainer.scrollLeft = 2000;
      scrollContainer.dispatchEvent(new Event("scroll"));
      await ctx.frame();
      
      // @ts-expect-error accessing private property
      ctx.expect(strip._currentScrollLeft).toBe(2000);
      
      // Scroll to end
      scrollContainer.scrollLeft = 5500;
      scrollContainer.dispatchEvent(new Event("scroll"));
      await ctx.frame();
      
      // @ts-expect-error accessing private property
      ctx.expect(strip._currentScrollLeft).toBe(5500);
      
      // Canvas should still have content at all positions
      const canvas = strip.shadowRoot?.querySelector("canvas");
      ctx.expect(canvasHasContent(canvas!)).toBe(true);
    },
    
    async "maintains canvas content during rapid scroll"(ctx) {
      const container = ctx.getContainer();
      const testContext = createTestContext();
      container.appendChild(testContext);
      
      const timegroup = createTimegroup("tg-rapid-scroll", { durationMs: 30000 });
      timegroup.style.display = "none";
      testContext.appendChild(timegroup);
      
      const scrollContainer = createScrollContainer({ viewportWidth: 400, contentWidth: 3000 });
      testContext.appendChild(scrollContainer);
      
      const strip = createThumbnailStrip("tg-rapid-scroll", { width: 3000 });
      scrollContainer.querySelector("div")!.appendChild(strip);
      
      await timegroup.updateComplete;
      await waitForThumbnails(strip, ctx);
      
      const canvas = strip.shadowRoot?.querySelector("canvas");
      ctx.expect(canvasHasContent(canvas!)).toBe(true);
      
      // Simulate rapid scrolling
      for (let i = 0; i < 5; i++) {
        scrollContainer.scrollLeft = i * 200;
        scrollContainer.dispatchEvent(new Event("scroll"));
        await ctx.frame();
      }
      
      // Canvas should still have content (not blank during scroll)
      ctx.expect(canvasHasContent(canvas!)).toBe(true);
    },
    
    // ============================================
    // Video Targeting
    // ============================================
    
    async "targets video element directly"(ctx) {
      const container = ctx.getContainer();
      const testContext = createTestContext();
      container.appendChild(testContext);
      
      const video = createVideo("direct-video");
      const strip = createThumbnailStrip("direct-video");
      
      testContext.appendChild(video);
      testContext.appendChild(strip);
      
      await video.updateComplete;
      await strip.updateComplete;
      await ctx.frame();
      
      // Force target resolution by toggling target attribute
      strip.setAttribute("target", "");
      await strip.updateComplete;
      strip.setAttribute("target", "direct-video");
      await strip.updateComplete;
      await ctx.frame();
      await ctx.wait(500);
      
      // Verify target was resolved
      ctx.expect(strip.targetElement).toBe(video);
      
      // Verify canvas renders
      const canvas = strip.shadowRoot?.querySelector("canvas");
      ctx.expect(canvas).toBeDefined();
      ctx.expect(canvas!.width).toBeGreaterThan(0);
    },
    
    async "computes layout for video target"(ctx) {
      const container = ctx.getContainer();
      const testContext = createTestContext();
      container.appendChild(testContext);
      
      const video = createVideo("video-layout");
      const strip = createThumbnailStrip("video-layout");
      
      testContext.appendChild(video);
      testContext.appendChild(strip);
      
      await video.updateComplete;
      await strip.updateComplete;
      await ctx.frame();
      
      // Force target resolution
      strip.setAttribute("target", "");
      await strip.updateComplete;
      strip.setAttribute("target", "video-layout");
      await strip.updateComplete;
      await ctx.wait(500);
      
      // Verify target is resolved
      ctx.expect(strip.targetElement).toBe(video);
      
      // Canvas should exist and be ready for thumbnails
      const canvas = strip.shadowRoot?.querySelector("canvas");
      ctx.expect(canvas).toBeDefined();
      ctx.expect(canvas!.width).toBeGreaterThan(0);
      ctx.expect(canvas!.height).toBeGreaterThan(0);
      
      // Note: Actual video frame rendering depends on video loading/decoding
      // which may not complete in all test environments
    },
    
    async "handles video with custom time range"(ctx) {
      const container = ctx.getContainer();
      const testContext = createTestContext();
      container.appendChild(testContext);
      
      const video = createVideo("video-range");
      const strip = createThumbnailStrip("video-range", {
        startTimeMs: 1000,
        endTimeMs: 3000,
      });
      
      testContext.appendChild(video);
      testContext.appendChild(strip);
      
      await video.updateComplete;
      await ctx.wait(500);
      await strip.updateComplete;
      await ctx.frame();
      
      // Strip should use the custom time range
      ctx.expect(strip.startTimeMs).toBe(1000);
      ctx.expect(strip.endTimeMs).toBe(3000);
    },
    
    // ============================================
    // Mixed Content (Video + DOM)
    // ============================================
    
    async "renders thumbnails from mixed video and DOM content"(ctx) {
      const container = ctx.getContainer();
      const testContext = createTestContext();
      container.appendChild(testContext);
      
      const timegroup = createMixedContentTimegroup("tg-mixed");
      const strip = createThumbnailStrip("tg-mixed");
      
      testContext.appendChild(timegroup);
      testContext.appendChild(strip);
      
      await timegroup.updateComplete;
      await ctx.wait(1000); // Allow video inside timegroup to load
      await waitForThumbnails(strip, ctx);
      
      // Canvas should have content from the composition
      const canvas = strip.shadowRoot?.querySelector("canvas");
      ctx.expect(canvasHasContent(canvas!)).toBe(true);
    },
    
    async "captures DOM overlay on video in thumbnails"(ctx) {
      const container = ctx.getContainer();
      const testContext = createTestContext();
      container.appendChild(testContext);
      
      // Create timegroup with video and highly visible overlay
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      timegroup.id = "tg-overlay-test";
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "5000ms");
      timegroup.style.width = "320px";
      timegroup.style.height = "180px";
      timegroup.style.display = "block";
      timegroup.style.position = "relative";
      timegroup.innerHTML = `
        <ef-video src="${TEST_VIDEO_SRC}" mode="asset" style="width: 100%; height: 100%; object-fit: cover; position: absolute;"></ef-video>
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: red; color: white; padding: 20px; font-size: 24px; font-weight: bold;">
          OVERLAY
        </div>
      `;
      
      const strip = createThumbnailStrip("tg-overlay-test");
      
      testContext.appendChild(timegroup);
      testContext.appendChild(strip);
      
      await timegroup.updateComplete;
      await ctx.wait(1000);
      await waitForThumbnails(strip, ctx);
      
      const canvas = strip.shadowRoot?.querySelector("canvas");
      ctx.expect(canvasHasContent(canvas!)).toBe(true);
      
      // Verify there are cached thumbnails
      // @ts-expect-error accessing private property
      ctx.expect(strip._cachedThumbnails.length).toBeGreaterThan(0);
    },
    
    async "handles timegroup with multiple videos"(ctx) {
      const container = ctx.getContainer();
      const testContext = createTestContext();
      container.appendChild(testContext);
      
      // Create timegroup with side-by-side videos
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      timegroup.id = "tg-multi-video";
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "5000ms");
      timegroup.style.width = "640px";
      timegroup.style.height = "180px";
      timegroup.style.display = "flex";
      timegroup.innerHTML = `
        <ef-video src="${TEST_VIDEO_SRC}" mode="asset" style="width: 50%; height: 100%; object-fit: cover;"></ef-video>
        <ef-video src="${TEST_VIDEO_SRC}" mode="asset" style="width: 50%; height: 100%; object-fit: cover;"></ef-video>
      `;
      
      const strip = createThumbnailStrip("tg-multi-video", { width: 640 });
      
      testContext.appendChild(timegroup);
      testContext.appendChild(strip);
      
      await timegroup.updateComplete;
      await ctx.wait(1500); // Wait for both videos to load
      await waitForThumbnails(strip, ctx);
      
      const canvas = strip.shadowRoot?.querySelector("canvas");
      ctx.expect(canvasHasContent(canvas!)).toBe(true);
    },
    
    async "handles complex composition with text, shapes, and video"(ctx) {
      const container = ctx.getContainer();
      const testContext = createTestContext();
      container.appendChild(testContext);
      
      // Create a more complex composition
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      timegroup.id = "tg-complex";
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "5000ms");
      timegroup.style.width = "400px";
      timegroup.style.height = "225px";
      timegroup.style.display = "block";
      timegroup.style.position = "relative";
      timegroup.style.background = "#1a1a2e";
      timegroup.innerHTML = `
        <ef-video src="${TEST_VIDEO_SRC}" mode="asset" style="position: absolute; width: 60%; height: 60%; top: 20%; left: 5%; object-fit: cover; border-radius: 8px;"></ef-video>
        <div style="position: absolute; top: 10px; right: 10px; width: 80px; height: 80px; background: linear-gradient(45deg, #ff6b6b, #feca57); border-radius: 50%;"></div>
        <div style="position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); color: white; font-size: 18px; font-family: system-ui; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">
          Complex Composition
        </div>
        <div style="position: absolute; bottom: 10px; right: 10px; width: 100px; height: 4px; background: #4ade80; border-radius: 2px;"></div>
      `;
      
      const strip = createThumbnailStrip("tg-complex", { width: 500 });
      
      testContext.appendChild(timegroup);
      testContext.appendChild(strip);
      
      await timegroup.updateComplete;
      await ctx.wait(1500);
      await waitForThumbnails(strip, ctx);
      
      const canvas = strip.shadowRoot?.querySelector("canvas");
      ctx.expect(canvasHasContent(canvas!)).toBe(true);
      
      // @ts-expect-error accessing private property
      ctx.expect(strip._cachedThumbnails.length).toBeGreaterThan(0);
    },
  },
});
