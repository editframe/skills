import { defineSandbox } from "../sandbox/index.js";
import { html } from "lit";
import type { EFThumbnailStrip } from "./EFThumbnailStrip.js";
import type { EFTimegroup } from "./EFTimegroup.js";
import type { EFVideo } from "./EFVideo.js";
import { thumbnailImageCache } from "./EFThumbnailStrip.js";
import "./EFThumbnailStrip.js";
import "./EFTimegroup.js";
import "./EFVideo.js";

// Test video URL - use local asset for tests
const TEST_VIDEO_SRC = "/assets/bars-n-tone2.mp4";

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
 * Helper to wait for thumbnail strip to complete rendering including cache writes
 */
async function waitForThumbnails(
  strip: EFThumbnailStrip,
  ctx: { frame: () => Promise<void> }
) {
  // Wait for the layout task to complete
  // @ts-expect-error accessing private property for testing
  if (strip.thumbnailLayoutTask) {
    // @ts-expect-error accessing private property for testing
    await strip.thumbnailLayoutTask.taskComplete.catch(() => {});
  }
  // Wait for the full rendering pipeline (layout -> render -> cache)
  // @ts-expect-error accessing private property for testing
  if (strip._thumbnailLayoutTask) {
    // @ts-expect-error accessing private property for testing
    await strip._thumbnailLayoutTask.catch(() => {});
  }
  await ctx.frame();
}

/**
 * Helper to wait for all ef-video elements within a container to have their media engines ready
 */
async function waitForVideos(container: HTMLElement): Promise<void> {
  const videos = container.querySelectorAll("ef-video") as NodeListOf<EFVideo>;
  const promises = Array.from(videos).map(async (video) => {
    if (video.mediaEngineTask) {
      await video.mediaEngineTask.taskComplete.catch(() => {});
    }
  });
  await Promise.all(promises);
}

export default defineSandbox({
  name: "EFThumbnailStrip",
  description: "Canvas-based thumbnail strip for ef-video and ef-timegroup elements",
  category: "gui",
  subcategory: "preview",
  
  render: () => html``,

  setup: async () => {
    await thumbnailImageCache.clear();
  },
  
  scenarios: {
    // ============================================
    // DEMONSTRATION - Visual examples
    // ============================================
    
    "renders thumbnails from timegroup content": {
      category: "demonstration",
      description: "Shows thumbnail strip rendering from a timegroup",
      async run(ctx) {
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
    },
    
    // ============================================
    // INTERNALS - Target Resolution
    // ============================================
    
    "resolves timegroup target by ID": {
      category: "internals",
      async run(ctx) {
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
        
        ctx.expect(strip.target).toBe("tg-resolve");
        
        strip.setAttribute("target", "");
        await strip.updateComplete;
        strip.setAttribute("target", "tg-resolve");
        await strip.updateComplete;
        await ctx.frame();
        
        ctx.expect(strip.targetElement).toBe(timegroup);
      },
    },
    
    "handles missing target gracefully": {
      category: "internals",
      async run(ctx) {
        const container = ctx.getContainer();
        const testContext = createTestContext();
        container.appendChild(testContext);
        
        const strip = createThumbnailStrip("nonexistent-element");
        testContext.appendChild(strip);
        
        await strip.updateComplete;
        await ctx.frame();
        
        ctx.expect(strip.targetElement).toBeUndefined();
        
        const canvas = strip.shadowRoot?.querySelector("canvas");
        ctx.expect(canvas).toBeDefined();
      },
    },
    
    // ============================================
    // INTERNALS - Canvas Rendering
    // ============================================
    
    "renders canvas with correct dimensions": {
      category: "internals",
      async run(ctx) {
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
        
        const canvas = strip.shadowRoot?.querySelector("canvas");
        ctx.expect(canvas).toBeDefined();
        ctx.expect(canvas!.width).toBeGreaterThan(0);
        ctx.expect(canvas!.height).toBeGreaterThan(0);
      },
    },
    
    "updates dimensions on resize": {
      category: "internals",
      async run(ctx) {
        const container = ctx.getContainer();
        const testContext = createTestContext();
        container.appendChild(testContext);
        
        const timegroup = createTimegroup("tg-resize");
        const strip = createThumbnailStrip("tg-resize", { width: 300 });
        
        testContext.appendChild(timegroup);
        testContext.appendChild(strip);
        
        await timegroup.updateComplete;
        await waitForThumbnails(strip, ctx);
        
        strip.style.width = "600px";
        
        await ctx.frame();
        await ctx.frame();
        
        const canvas = strip.shadowRoot?.querySelector("canvas");
        ctx.expect(canvas).toBeDefined();
        ctx.expect(canvas!.width).toBeGreaterThan(0);
      },
    },
    
    // ============================================
    // INTERNALS - Time Range Properties
    // ============================================
    
    "respects start-time-ms and end-time-ms": {
      category: "internals",
      async run(ctx) {
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
    },
    
    "respects use-intrinsic-duration attribute": {
      category: "internals",
      async run(ctx) {
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
        
        strip.setAttribute("use-intrinsic-duration", "false");
        await strip.updateComplete;
        
        ctx.expect(strip.useIntrinsicDuration).toBe(false);
      },
    },
    
    "parses use-intrinsic-duration string values correctly": {
      category: "internals",
      async run(ctx) {
        const container = ctx.getContainer();
        const testContext = createTestContext();
        container.appendChild(testContext);
        
        const timegroup = createTimegroup("tg-parse");
        const strip = createThumbnailStrip("tg-parse");
        
        testContext.appendChild(timegroup);
        testContext.appendChild(strip);
        
        await strip.updateComplete;
        
        ctx.expect(strip.useIntrinsicDuration).toBe(false);
        
        strip.setAttribute("use-intrinsic-duration", "true");
        await strip.updateComplete;
        ctx.expect(strip.useIntrinsicDuration).toBe(true);
        
        strip.setAttribute("use-intrinsic-duration", "false");
        await strip.updateComplete;
        ctx.expect(strip.useIntrinsicDuration).toBe(false);
      },
    },
    
    // ============================================
    // INTERNALS - Edge Cases
    // ============================================
    
    "handles zero duration timegroup": {
      category: "internals",
      async run(ctx) {
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
        
        const canvas = strip.shadowRoot?.querySelector("canvas");
        ctx.expect(canvas).toBeDefined();
      },
    },
    
    "handles very short duration": {
      category: "internals",
      async run(ctx) {
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
        ctx.expect(canvasHasContent(canvas!)).toBe(true);
      },
    },
    
    "handles very long duration": {
      category: "internals",
      async run(ctx) {
        const container = ctx.getContainer();
        const testContext = createTestContext();
        container.appendChild(testContext);
        
        const timegroup = createTimegroup("tg-long", { durationMs: 600000 });
        const strip = createThumbnailStrip("tg-long", { width: 800 });
        
        testContext.appendChild(timegroup);
        testContext.appendChild(strip);
        
        await timegroup.updateComplete;
        await strip.updateComplete;
        await ctx.frame();
        
        const canvas = strip.shadowRoot?.querySelector("canvas");
        ctx.expect(canvas).toBeDefined();
        
        const dpr = window.devicePixelRatio || 1;
        const maxExpectedWidth = (800 + 800) * dpr;
        ctx.expect(canvas!.width).toBeLessThanOrEqual(maxExpectedWidth);
      },
    },
    
    // ============================================
    // INTERNALS - Cache Behavior
    // ============================================
    
    "caches thumbnails in memory": {
      category: "internals",
      async run(ctx) {
        const container = ctx.getContainer();
        const testContext = createTestContext();
        container.appendChild(testContext);
        
        const timegroup = createTimegroup("tg-cache");
        const strip = createThumbnailStrip("tg-cache");
        
        testContext.appendChild(timegroup);
        testContext.appendChild(strip);
        
        await timegroup.updateComplete;
        await waitForThumbnails(strip, ctx);
        
        // @ts-expect-error accessing private property for testing
        ctx.expect(strip._cachedThumbnails.length).toBeGreaterThan(0);
      },
    },
    
    "reuses cached thumbnails on re-render": {
      category: "internals",
      async run(ctx) {
        const container = ctx.getContainer();
        const testContext = createTestContext();
        container.appendChild(testContext);
        
        const timegroup = createTimegroup("tg-cache-reuse");
        const strip = createThumbnailStrip("tg-cache-reuse");
        
        testContext.appendChild(timegroup);
        testContext.appendChild(strip);
        
        await timegroup.updateComplete;
        await waitForThumbnails(strip, ctx);
        
        // @ts-expect-error accessing private property for testing
        const initialCount = strip._cachedThumbnails.length;
        ctx.expect(initialCount).toBeGreaterThan(0);
        
        // @ts-expect-error accessing private method
        strip.runThumbnailUpdate();
        await waitForThumbnails(strip, ctx);
        
        // @ts-expect-error accessing private property for testing
        ctx.expect(strip._cachedThumbnails.length).toBe(initialCount);
      },
    },
    
    "regenerates after cache clear": {
      category: "internals",
      async run(ctx) {
        const container = ctx.getContainer();
        const testContext = createTestContext();
        container.appendChild(testContext);
        
        const timegroup = createTimegroup("tg-cache-clear");
        const strip = createThumbnailStrip("tg-cache-clear");
        
        testContext.appendChild(timegroup);
        testContext.appendChild(strip);
        
        await timegroup.updateComplete;
        await waitForThumbnails(strip, ctx);
        
        const canvas = strip.shadowRoot?.querySelector("canvas");
        ctx.expect(canvasHasContent(canvas!)).toBe(true);
        // @ts-expect-error accessing private property for testing
        ctx.expect(strip._cachedThumbnails.length).toBeGreaterThan(0);
        
        await thumbnailImageCache.clear();
        // @ts-expect-error accessing private property for testing
        strip._cachedThumbnails = [];
        
        // @ts-expect-error accessing private method
        strip.runThumbnailUpdate();
        await waitForThumbnails(strip, ctx);
        
        ctx.expect(canvasHasContent(canvas!)).toBe(true);
        // @ts-expect-error accessing private property for testing
        ctx.expect(strip._cachedThumbnails.length).toBeGreaterThan(0);
      },
    },
    
    // ============================================
    // INTERNALS - Scroll & Virtual Rendering
    // ============================================
    
    "attaches to scrollable parent container": {
      category: "internals",
      async run(ctx) {
        const container = ctx.getContainer();
        const testContext = createTestContext();
        container.appendChild(testContext);
        
        const timegroup = createTimegroup("tg-scroll-attach", { durationMs: 30000 });
        timegroup.style.display = "none";
        testContext.appendChild(timegroup);
        
        const scrollContainer = createScrollContainer({ viewportWidth: 400, contentWidth: 3000 });
        testContext.appendChild(scrollContainer);
        
        const strip = createThumbnailStrip("tg-scroll-attach", { width: 3000 });
        scrollContainer.querySelector("div")!.appendChild(strip);
        
        await timegroup.updateComplete;
        await strip.updateComplete;
        await ctx.frame();
        
        // @ts-expect-error accessing private property
        ctx.expect(strip._scrollContainer).toBe(scrollContainer);
      },
    },
    
    "redraws on scroll within container": {
      category: "internals",
      async run(ctx) {
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
        
        // @ts-expect-error accessing private property
        const initialScrollLeft = strip._currentScrollLeft;
        ctx.expect(initialScrollLeft).toBe(0);
        
        scrollContainer.scrollLeft = 500;
        scrollContainer.dispatchEvent(new Event("scroll"));
        await ctx.frame();
        
        // @ts-expect-error accessing private property
        ctx.expect(strip._currentScrollLeft).toBe(500);
      },
    },
    
    "virtualizes canvas based on scroll container viewport": {
      category: "internals",
      async run(ctx) {
        const container = ctx.getContainer();
        const testContext = createTestContext();
        container.appendChild(testContext);
        
        const timegroup = createTimegroup("tg-virtual-scroll", { durationMs: 600000 });
        timegroup.style.display = "none";
        testContext.appendChild(timegroup);
        
        const scrollContainer = createScrollContainer({ viewportWidth: 400, contentWidth: 60000 });
        testContext.appendChild(scrollContainer);
        
        const strip = createThumbnailStrip("tg-virtual-scroll", { width: 60000, pixelsPerMs: 0.1 });
        scrollContainer.querySelector("div")!.appendChild(strip);
        
        await timegroup.updateComplete;
        await strip.updateComplete;
        await ctx.frame();
        
        const canvas = strip.shadowRoot?.querySelector("canvas");
        ctx.expect(canvas).toBeDefined();
        
        const dpr = window.devicePixelRatio || 1;
        const maxExpectedWidth = (400 + 800) * dpr;
        ctx.expect(canvas!.width).toBeLessThanOrEqual(maxExpectedWidth);
        ctx.expect(canvas!.width).toBeGreaterThan(0);
      },
    },
    
    "renders visible thumbnails only": {
      category: "internals",
      async run(ctx) {
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
        
        // @ts-expect-error accessing private property
        const cachedThumbnails = strip._cachedThumbnails;
        ctx.expect(cachedThumbnails.length).toBeGreaterThan(0);
        
        const minX = Math.min(...cachedThumbnails.map((t: { x: number }) => t.x));
        ctx.expect(minX).toBeLessThan(100);
      },
    },
    
    "tracks scroll position for redraw calculations": {
      category: "internals",
      async run(ctx) {
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
        
        // @ts-expect-error accessing private property
        const initialScrollLeft = strip._currentScrollLeft;
        ctx.expect(initialScrollLeft).toBe(0);
        
        scrollContainer.scrollLeft = 2000;
        scrollContainer.dispatchEvent(new Event("scroll"));
        await ctx.frame();
        
        // @ts-expect-error accessing private property
        ctx.expect(strip._currentScrollLeft).toBe(2000);
        
        scrollContainer.scrollLeft = 5500;
        scrollContainer.dispatchEvent(new Event("scroll"));
        await ctx.frame();
        
        // @ts-expect-error accessing private property
        ctx.expect(strip._currentScrollLeft).toBe(5500);
        
        const canvas = strip.shadowRoot?.querySelector("canvas");
        ctx.expect(canvasHasContent(canvas!)).toBe(true);
      },
    },
    
    "maintains canvas content during rapid scroll": {
      category: "internals",
      async run(ctx) {
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
        
        for (let i = 0; i < 5; i++) {
          scrollContainer.scrollLeft = i * 200;
          scrollContainer.dispatchEvent(new Event("scroll"));
          await ctx.frame();
        }
        
        ctx.expect(canvasHasContent(canvas!)).toBe(true);
      },
    },
    
    // ============================================
    // DEMONSTRATION - Video Targeting
    // ============================================
    
    "targets video element directly": {
      category: "demonstration",
      description: "Shows thumbnail strip targeting a video element",
      async run(ctx) {
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
        
        strip.setAttribute("target", "");
        await strip.updateComplete;
        strip.setAttribute("target", "direct-video");
        await strip.updateComplete;
        if (video.mediaEngineTask) {
          await video.mediaEngineTask.taskComplete.catch(() => {});
        }
        await ctx.frame();
        
        ctx.expect(strip.targetElement).toBe(video);
        
        const canvas = strip.shadowRoot?.querySelector("canvas");
        ctx.expect(canvas).toBeDefined();
        ctx.expect(canvas!.width).toBeGreaterThan(0);
      },
    },
    
    "computes layout for video target": {
      category: "internals",
      async run(ctx) {
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
        
        strip.setAttribute("target", "");
        await strip.updateComplete;
        strip.setAttribute("target", "video-layout");
        await strip.updateComplete;
        if (video.mediaEngineTask) {
          await video.mediaEngineTask.taskComplete.catch(() => {});
        }
        await ctx.frame();
        
        ctx.expect(strip.targetElement).toBe(video);
        
        const canvas = strip.shadowRoot?.querySelector("canvas");
        ctx.expect(canvas).toBeDefined();
        ctx.expect(canvas!.width).toBeGreaterThan(0);
        ctx.expect(canvas!.height).toBeGreaterThan(0);
      },
    },
    
    "handles video with custom time range": {
      category: "internals",
      async run(ctx) {
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
        if (video.mediaEngineTask) {
          await video.mediaEngineTask.taskComplete.catch(() => {});
        }
        await strip.updateComplete;
        await ctx.frame();
        
        ctx.expect(strip.startTimeMs).toBe(1000);
        ctx.expect(strip.endTimeMs).toBe(3000);
      },
    },
    
    // ============================================
    // DEMONSTRATION - Mixed Content (Video + DOM)
    // ============================================
    
    "renders thumbnails from mixed video and DOM content": {
      category: "demonstration",
      description: "Shows thumbnails from composition with video and DOM elements",
      async run(ctx) {
        const container = ctx.getContainer();
        const testContext = createTestContext();
        container.appendChild(testContext);
        
        const timegroup = createMixedContentTimegroup("tg-mixed");
        const strip = createThumbnailStrip("tg-mixed");
        
        testContext.appendChild(timegroup);
        testContext.appendChild(strip);
        
        await timegroup.updateComplete;
        await waitForVideos(timegroup);
        await waitForThumbnails(strip, ctx);
        
        const canvas = strip.shadowRoot?.querySelector("canvas");
        ctx.expect(canvasHasContent(canvas!)).toBe(true);
      },
    },
    
    "captures DOM overlay on video in thumbnails": {
      category: "internals",
      async run(ctx) {
        const container = ctx.getContainer();
        const testContext = createTestContext();
        container.appendChild(testContext);
        
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
        await waitForVideos(timegroup);
        await waitForThumbnails(strip, ctx);
        
        const canvas = strip.shadowRoot?.querySelector("canvas");
        ctx.expect(canvasHasContent(canvas!)).toBe(true);
        
        // @ts-expect-error accessing private property
        ctx.expect(strip._cachedThumbnails.length).toBeGreaterThan(0);
      },
    },
    
    "handles timegroup with multiple videos": {
      category: "internals",
      async run(ctx) {
        const container = ctx.getContainer();
        const testContext = createTestContext();
        container.appendChild(testContext);
        
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
        await waitForVideos(timegroup);
        await waitForThumbnails(strip, ctx);
        
        const canvas = strip.shadowRoot?.querySelector("canvas");
        ctx.expect(canvasHasContent(canvas!)).toBe(true);
      },
    },
    
    "handles complex composition with text, shapes, and video": {
      category: "demonstration",
      description: "Shows thumbnails from complex composition with video, shapes, and text",
      async run(ctx) {
        const container = ctx.getContainer();
        const testContext = createTestContext();
        container.appendChild(testContext);
        
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
        await waitForVideos(timegroup);
        await waitForThumbnails(strip, ctx);
        
        const canvas = strip.shadowRoot?.querySelector("canvas");
        ctx.expect(canvasHasContent(canvas!)).toBe(true);
        
        // @ts-expect-error accessing private property
        ctx.expect(strip._cachedThumbnails.length).toBeGreaterThan(0);
      },
    },
  },
});
