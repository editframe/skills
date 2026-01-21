import { defineSandbox } from "@editframe/elements/sandbox";
import { html } from "lit";
import React from "react";
import { createRoot } from "react-dom/client";
import { ThumbnailStrip } from "./ThumbnailStrip.js";
import type { EFThumbnailStrip } from "@editframe/elements";
import "@editframe/elements/elements/EFThumbnailStrip.js";
import "@editframe/elements/elements/EFTimegroup.js";
import "@editframe/elements/elements/EFVideo.js";

/**
 * Helper to create a timegroup for testing
 */
function createTimegroup(id: string, options: {
  durationMs?: number;
  width?: number;
  height?: number;
} = {}): HTMLElement {
  const {
    durationMs = 5000,
    width = 320,
    height = 180,
  } = options;

  const timegroup = document.createElement("ef-timegroup");
  timegroup.id = id;
  timegroup.setAttribute("mode", "fixed");
  timegroup.setAttribute("duration", `${durationMs}ms`);
  timegroup.style.width = `${width}px`;
  timegroup.style.height = `${height}px`;
  timegroup.style.display = "block";
  timegroup.style.background = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
  
  return timegroup;
}

export default defineSandbox({
  name: "ThumbnailStrip",
  description: "React wrapper for EFThumbnailStrip web component",
  category: "gui",
  subcategory: "preview",
  
  render: () => html`

  `,
  
  setup: async (container) => {
    // Render React component after container is set up
    // Note: React roots are cleaned up automatically when container is cleared between scenarios
    const mountPoint = container.querySelector("#react-thumbnail-strip-mount");
    if (mountPoint && mountPoint.children.length === 0) {
      const root = createRoot(mountPoint);
      root.render(
        React.createElement(ThumbnailStrip, {
          target: "react-demo-timegroup",
          style: { width: "400px", height: "48px" },
        })
      );
    }
  },
  
  scenarios: {
    // ============================================
    // Demonstration Scenarios
    // ============================================
    
    "React wrapper usage": {
      category: "demonstration",
      description: "Visual demonstration of React wrapper usage",
      run: async (ctx) => {
        const container = ctx.getContainer();
        const mountPoint = container.querySelector("#react-thumbnail-strip-mount");
        ctx.expect(mountPoint).toBeDefined();
        
        // Find the underlying web component
        const webComponent = mountPoint?.querySelector("ef-thumbnail-strip") as EFThumbnailStrip | null;
        ctx.expect(webComponent).toBeDefined();
        
        await ctx.frame();
        await webComponent?.updateComplete;
        await ctx.frame();
        
        // Verify the web component exists and is connected
        ctx.expect(webComponent?.isConnected).toBe(true);
      },
    },
    
    // ============================================
    // Internals/Invariants Scenarios
    // ============================================
    
    "forwards target prop to web component": {
      category: "internals",
      description: "Verify prop forwarding",
      run: async (ctx) => {
        const container = ctx.getContainer();
        const mountPoint = container.querySelector("#react-thumbnail-strip-mount");
        
        // Clear mount point and re-render with specific target
        if (mountPoint) {
          mountPoint.innerHTML = "";
          const root = createRoot(mountPoint);
          root.render(
            React.createElement(ThumbnailStrip, {
              target: "react-demo-timegroup",
              style: { width: "400px", height: "48px" },
            })
          );
        }
        
        await ctx.frame();
        
        const webComponent = mountPoint?.querySelector("ef-thumbnail-strip") as EFThumbnailStrip | null;
        ctx.expect(webComponent).toBeDefined();
        await webComponent?.updateComplete;
        await ctx.frame();
        
        ctx.expect(webComponent?.target).toBe("react-demo-timegroup");
      },
    },
    
    "forwards pixels-per-ms prop to web component": {
      category: "internals",
      description: "Verify prop forwarding",
      run: async (ctx) => {
        const container = ctx.getContainer();
        const mountPoint = container.querySelector("#react-thumbnail-strip-mount");
        
        // Create a timegroup for targeting
        const timegroup = createTimegroup("react-pixels-test");
        container.appendChild(timegroup);
        
        // Clear mount point and re-render with pixelsPerMs prop
        if (mountPoint) {
          mountPoint.innerHTML = "";
          const root = createRoot(mountPoint);
          root.render(
            React.createElement(ThumbnailStrip, {
              target: "react-pixels-test",
              pixelsPerMs: 0.2,
              style: { width: "400px", height: "48px" },
            })
          );
        }
        
        await ctx.frame();
        
        const webComponent = mountPoint?.querySelector("ef-thumbnail-strip") as EFThumbnailStrip | null;
        ctx.expect(webComponent).toBeDefined();
        await webComponent?.updateComplete;
        await ctx.frame();
        
        ctx.expect(webComponent?.pixelsPerMs).toBe(0.2);
      },
    },
    
    "forwards start-time-ms prop to web component": {
      category: "internals",
      description: "Verify prop forwarding",
      run: async (ctx) => {
        const container = ctx.getContainer();
        const mountPoint = container.querySelector("#react-thumbnail-strip-mount");
        
        // Create a timegroup for targeting
        const timegroup = createTimegroup("react-start-time-test", { durationMs: 10000 });
        container.appendChild(timegroup);
        
        // Clear mount point and re-render with startTimeMs prop
        if (mountPoint) {
          mountPoint.innerHTML = "";
          const root = createRoot(mountPoint);
          root.render(
            React.createElement(ThumbnailStrip, {
              target: "react-start-time-test",
              startTimeMs: 2000,
              style: { width: "400px", height: "48px" },
            })
          );
        }
        
        await ctx.frame();
        
        const webComponent = mountPoint?.querySelector("ef-thumbnail-strip") as EFThumbnailStrip | null;
        ctx.expect(webComponent).toBeDefined();
        await webComponent?.updateComplete;
        await ctx.frame();
        
        ctx.expect(webComponent?.startTimeMs).toBe(2000);
      },
    },
    
    "forwards end-time-ms prop to web component": {
      category: "internals",
      description: "Verify prop forwarding",
      run: async (ctx) => {
        const container = ctx.getContainer();
        const mountPoint = container.querySelector("#react-thumbnail-strip-mount");
        
        // Create a timegroup for targeting
        const timegroup = createTimegroup("react-end-time-test", { durationMs: 10000 });
        container.appendChild(timegroup);
        
        // Clear mount point and re-render with endTimeMs prop
        if (mountPoint) {
          mountPoint.innerHTML = "";
          const root = createRoot(mountPoint);
          root.render(
            React.createElement(ThumbnailStrip, {
              target: "react-end-time-test",
              endTimeMs: 8000,
              style: { width: "400px", height: "48px" },
            })
          );
        }
        
        await ctx.frame();
        
        const webComponent = mountPoint?.querySelector("ef-thumbnail-strip") as EFThumbnailStrip | null;
        ctx.expect(webComponent).toBeDefined();
        await webComponent?.updateComplete;
        await ctx.frame();
        
        ctx.expect(webComponent?.endTimeMs).toBe(8000);
      },
    },
    
    "forwards use-intrinsic-duration prop to web component": {
      category: "internals",
      description: "Verify prop forwarding",
      run: async (ctx) => {
        const container = ctx.getContainer();
        const mountPoint = container.querySelector("#react-thumbnail-strip-mount");
        
        // Create a timegroup for targeting
        const timegroup = createTimegroup("react-intrinsic-test");
        container.appendChild(timegroup);
        
        // Clear mount point and re-render with useIntrinsicDuration prop
        if (mountPoint) {
          mountPoint.innerHTML = "";
          const root = createRoot(mountPoint);
          root.render(
            React.createElement(ThumbnailStrip, {
              target: "react-intrinsic-test",
              useIntrinsicDuration: true,
              style: { width: "400px", height: "48px" },
            })
          );
        }
        
        await ctx.frame();
        
        const webComponent = mountPoint?.querySelector("ef-thumbnail-strip") as EFThumbnailStrip | null;
        ctx.expect(webComponent).toBeDefined();
        await webComponent?.updateComplete;
        await ctx.frame();
        
        ctx.expect(webComponent?.useIntrinsicDuration).toBe(true);
      },
    },
    
    // ============================================
    // Virtual Rendering (Internals)
    // ============================================
    
    "canvas width matches viewport width exactly": {
      category: "internals",
      description: "Canvas should NEVER be wider than visible viewport - must match exactly",
      run: async (ctx) => {
        const container = ctx.getContainer();
        
        // Create scroll container with 400px viewport
        const scrollContainer = document.createElement("div");
        scrollContainer.style.width = "400px";
        scrollContainer.style.height = "300px";
        scrollContainer.style.overflowX = "auto";
        scrollContainer.style.overflowY = "hidden";
        scrollContainer.style.position = "relative";
        
        // Create inner content that's wider than viewport
        const innerContent = document.createElement("div");
        innerContent.style.width = "2000px";
        innerContent.style.height = "100%";
        innerContent.style.position = "relative";
        
        // Create timegroup for targeting
        const timegroup = createTimegroup("react-virtual-test", { durationMs: 30000 });
        timegroup.style.display = "none";
        container.appendChild(timegroup);
        
        // Create thumbnail strip inside scroll container
        const mountPoint = document.createElement("div");
        innerContent.appendChild(mountPoint);
        scrollContainer.appendChild(innerContent);
        container.appendChild(scrollContainer);
        
        const root = createRoot(mountPoint);
        root.render(
          React.createElement(ThumbnailStrip, {
            target: "react-virtual-test",
            style: { width: "2000px", height: "48px", position: "absolute", top: "0", left: "0" },
          })
        );
        
        await ctx.frame();
        
        const webComponent = mountPoint.querySelector("ef-thumbnail-strip") as EFThumbnailStrip | null;
        ctx.expect(webComponent).toBeDefined();
        await webComponent?.updateComplete;
        await ctx.frame();
        
        // Wait for layout and scroll listener attachment
        // @ts-expect-error accessing private property
        if (webComponent?.thumbnailLayoutTask) {
          // @ts-expect-error accessing private property
          await webComponent.thumbnailLayoutTask.taskComplete.catch(() => {});
        }
        await ctx.frame();
        await ctx.frame(); // Extra frame for scroll listener to attach
        
        // Get canvas
        const canvas = webComponent?.shadowRoot?.querySelector("canvas");
        ctx.expect(canvas).toBeDefined();
        
        // Canvas width should match viewport width (400px) EXACTLY, not content width (2000px)
        const viewportWidth = scrollContainer.clientWidth;
        const canvasStyleWidth = canvas?.style.width;
        const canvasWidthPx = canvasStyleWidth ? parseInt(canvasStyleWidth, 10) : 0;
        const canvasActualWidth = canvas?.getBoundingClientRect().width || 0;
        
        // Style width must match viewport
        ctx.expect(canvasWidthPx).toBe(viewportWidth);
        // Actual rendered width must also match viewport (accounting for device pixel ratio)
        const dpr = window.devicePixelRatio || 1;
        const expectedActualWidth = viewportWidth * dpr;
        ctx.expect(Math.abs(canvasActualWidth - viewportWidth)).toBeLessThan(1); // Allow for sub-pixel differences
        
        // Verify strip element width also matches viewport (not content width)
        const stripWidth = webComponent?.getBoundingClientRect().width || 0;
        ctx.expect(Math.abs(stripWidth - viewportWidth)).toBeLessThan(1);
      },
    },
    
    "canvas stays fixed at viewport left edge when scrolling": {
      category: "internals",
      description: "Canvas position should NEVER change when scrolling - it must stay fixed",
      run: async (ctx) => {
        const container = ctx.getContainer();
        
        // Create scroll container with 500px viewport
        const scrollContainer = document.createElement("div");
        scrollContainer.style.width = "500px";
        scrollContainer.style.height = "300px";
        scrollContainer.style.overflowX = "auto";
        scrollContainer.style.overflowY = "hidden";
        scrollContainer.style.position = "relative";
        
        // Create inner content that's wider than viewport
        const innerContent = document.createElement("div");
        innerContent.style.width = "3000px";
        innerContent.style.height = "100%";
        innerContent.style.position = "relative";
        
        // Create timegroup for targeting
        const timegroup = createTimegroup("react-scroll-test", { durationMs: 30000 });
        timegroup.style.display = "none";
        container.appendChild(timegroup);
        
        // Create thumbnail strip inside scroll container
        const mountPoint = document.createElement("div");
        innerContent.appendChild(mountPoint);
        scrollContainer.appendChild(innerContent);
        container.appendChild(scrollContainer);
        
        const root = createRoot(mountPoint);
        root.render(
          React.createElement(ThumbnailStrip, {
            target: "react-scroll-test",
            style: { width: "3000px", height: "48px", position: "absolute", top: "0", left: "0" },
          })
        );
        
        await ctx.frame();
        
        const webComponent = mountPoint.querySelector("ef-thumbnail-strip") as EFThumbnailStrip | null;
        ctx.expect(webComponent).toBeDefined();
        await webComponent?.updateComplete;
        await ctx.frame();
        
        // Wait for layout and scroll listener attachment
        // @ts-expect-error accessing private property
        if (webComponent?.thumbnailLayoutTask) {
          // @ts-expect-error accessing private property
          await webComponent.thumbnailLayoutTask.taskComplete.catch(() => {});
        }
        await ctx.frame();
        await ctx.frame(); // Extra frame for scroll listener to attach
        
        // Get canvas and its position
        const canvas = webComponent?.shadowRoot?.querySelector("canvas");
        ctx.expect(canvas).toBeDefined();
        
        // Get initial canvas position relative to scroll container
        const canvasRect = canvas!.getBoundingClientRect();
        const containerRect = scrollContainer.getBoundingClientRect();
        const initialCanvasLeft = canvasRect.left - containerRect.left;
        const initialCanvasX = canvasRect.x;
        
        // Canvas should be at left edge of viewport
        ctx.expect(initialCanvasLeft).toBe(0);
        
        // Scroll to multiple positions and verify canvas NEVER moves
        const scrollPositions = [500, 1000, 1500, 2000, 500, 0];
        for (const scrollPos of scrollPositions) {
          scrollContainer.scrollLeft = scrollPos;
          // Dispatch scroll event to trigger handler
          scrollContainer.dispatchEvent(new Event('scroll', { bubbles: true }));
          await ctx.frame();
          await ctx.frame(); // Allow position update to apply
          
          // Canvas position should NEVER change - must stay at container's left edge
          const canvasRectAfterScroll = canvas!.getBoundingClientRect();
          const containerRectAfterScroll = scrollContainer.getBoundingClientRect();
          const canvasLeftAfterScroll = canvasRectAfterScroll.left - containerRectAfterScroll.left;
          const canvasXAfterScroll = canvasRectAfterScroll.x;
          
          // Canvas should still be at left edge (position = 0 relative to container)
          ctx.expect(canvasLeftAfterScroll).toBe(0);
          // Canvas absolute X position should match container's X position
          ctx.expect(canvasXAfterScroll).toBe(containerRectAfterScroll.x);
        }
      },
    },
    
    "strip element width matches viewport not content width": {
      category: "internals",
      description: "Strip element rendered width must match viewport, not content width",
      run: async (ctx) => {
        const container = ctx.getContainer();
        
        // Create scroll container with 600px viewport
        const scrollContainer = document.createElement("div");
        scrollContainer.style.width = "600px";
        scrollContainer.style.height = "300px";
        scrollContainer.style.overflowX = "auto";
        scrollContainer.style.overflowY = "hidden";
        scrollContainer.style.position = "relative";
        
        // Create inner content that's much wider than viewport
        const innerContent = document.createElement("div");
        innerContent.style.width = "5000px";
        innerContent.style.height = "100%";
        innerContent.style.position = "relative";
        
        // Create timegroup for targeting
        const timegroup = createTimegroup("react-width-test", { durationMs: 30000 });
        timegroup.style.display = "none";
        container.appendChild(timegroup);
        
        // Create thumbnail strip inside scroll container
        const mountPoint = document.createElement("div");
        innerContent.appendChild(mountPoint);
        scrollContainer.appendChild(innerContent);
        container.appendChild(scrollContainer);
        
        const root = createRoot(mountPoint);
        root.render(
          React.createElement(ThumbnailStrip, {
            target: "react-width-test",
            style: { width: "5000px", height: "48px", position: "absolute", top: "0", left: "0" },
          })
        );
        
        await ctx.frame();
        
        const webComponent = mountPoint.querySelector("ef-thumbnail-strip") as EFThumbnailStrip | null;
        ctx.expect(webComponent).toBeDefined();
        await webComponent?.updateComplete;
        await ctx.frame();
        
        // Wait for layout and scroll listener attachment
        // @ts-expect-error accessing private property
        if (webComponent?.thumbnailLayoutTask) {
          // @ts-expect-error accessing private property
          await webComponent.thumbnailLayoutTask.taskComplete.catch(() => {});
        }
        await ctx.frame();
        await ctx.frame();
        
        const viewportWidth = scrollContainer.clientWidth;
        const contentWidth = 5000;
        
        // Strip element's rendered width should be viewport width (600px), NOT content width (5000px)
        const stripRect = webComponent?.getBoundingClientRect();
        const stripRenderedWidth = stripRect?.width || 0;
        ctx.expect(Math.abs(stripRenderedWidth - viewportWidth)).toBeLessThan(1);
        ctx.expect(stripRenderedWidth).not.toBe(contentWidth);
        
        // Strip's style width should also be viewport width
        const stripStyleWidth = webComponent?.style.width;
        const stripStyleWidthPx = stripStyleWidth ? parseInt(stripStyleWidth, 10) : 0;
        ctx.expect(stripStyleWidthPx).toBe(viewportWidth);
        
        // But logical width (for layout) should be content width
        // @ts-expect-error accessing private property
        const logicalWidth = webComponent?.dataset.logicalWidth ? parseInt(webComponent.dataset.logicalWidth, 10) : 0;
        ctx.expect(logicalWidth).toBe(contentWidth);
      },
    },
    
    "canvas never moves horizontally during scroll": {
      category: "internals",
      description: "CRITICAL: Canvas must NEVER move horizontally - regression test for double-scroll bug",
      run: async (ctx) => {
        const container = ctx.getContainer();
        
        // Create scroll container
        const scrollContainer = document.createElement("div");
        scrollContainer.style.width = "400px";
        scrollContainer.style.height = "300px";
        scrollContainer.style.overflowX = "auto";
        scrollContainer.style.overflowY = "hidden";
        scrollContainer.style.position = "relative";
        
        // Create inner content wider than viewport
        const innerContent = document.createElement("div");
        innerContent.style.width = "2000px";
        innerContent.style.height = "100%";
        innerContent.style.position = "relative";
        
        // Create timegroup
        const timegroup = createTimegroup("react-no-move-test", { durationMs: 30000 });
        timegroup.style.display = "none";
        container.appendChild(timegroup);
        
        // Create thumbnail strip
        const mountPoint = document.createElement("div");
        innerContent.appendChild(mountPoint);
        scrollContainer.appendChild(innerContent);
        container.appendChild(scrollContainer);
        
        const root = createRoot(mountPoint);
        root.render(
          React.createElement(ThumbnailStrip, {
            target: "react-no-move-test",
            style: { width: "2000px", height: "48px", position: "absolute", top: "0", left: "0" },
          })
        );
        
        await ctx.frame();
        
        const webComponent = mountPoint.querySelector("ef-thumbnail-strip") as EFThumbnailStrip | null;
        ctx.expect(webComponent).toBeDefined();
        await webComponent?.updateComplete;
        await ctx.frame();
        
        // Wait for layout and scroll listener
        // @ts-expect-error accessing private property
        if (webComponent?.thumbnailLayoutTask) {
          // @ts-expect-error accessing private property
          await webComponent.thumbnailLayoutTask.taskComplete.catch(() => {});
        }
        await ctx.frame();
        await ctx.frame();
        
        const canvas = webComponent?.shadowRoot?.querySelector("canvas");
        ctx.expect(canvas).toBeDefined();
        
        // Get initial canvas position (absolute screen coordinates)
        const initialCanvasRect = canvas!.getBoundingClientRect();
        const initialCanvasX = initialCanvasRect.x;
        const initialCanvasLeft = initialCanvasRect.left;
        
        // Scroll to various positions
        const scrollPositions = [100, 500, 1000, 1500, 800, 200, 0];
        for (const scrollPos of scrollPositions) {
          scrollContainer.scrollLeft = scrollPos;
          scrollContainer.dispatchEvent(new Event('scroll', { bubbles: true }));
          await ctx.frame();
          await ctx.frame();
          
          // Canvas X position should NEVER change - must stay exactly the same
          const canvasRect = canvas!.getBoundingClientRect();
          const canvasX = canvasRect.x;
          const canvasLeft = canvasRect.left;
          
          // Canvas absolute position must not change at all
          ctx.expect(canvasX).toBe(initialCanvasX);
          ctx.expect(canvasLeft).toBe(initialCanvasLeft);
          
          // Canvas position relative to container should always be 0
          const containerRect = scrollContainer.getBoundingClientRect();
          const canvasLeftRelative = canvasLeft - containerRect.left;
          ctx.expect(canvasLeftRelative).toBe(0);
        }
      },
    },
    
    "loads visible thumbnails when scrolling": {
      category: "internals",
      description: "All thumbnails in visible viewport should be loaded",
      run: async (ctx) => {
        const container = ctx.getContainer();
        
        // Create scroll container with 400px viewport
        const scrollContainer = document.createElement("div");
        scrollContainer.style.width = "400px";
        scrollContainer.style.height = "300px";
        scrollContainer.style.overflowX = "auto";
        scrollContainer.style.overflowY = "hidden";
        scrollContainer.style.position = "relative";
        
        // Create inner content that's wider than viewport
        const innerContent = document.createElement("div");
        innerContent.style.width = "2000px";
        innerContent.style.height = "100%";
        innerContent.style.position = "relative";
        
        // Create timegroup for targeting
        const timegroup = createTimegroup("react-load-test", { durationMs: 30000 });
        timegroup.style.display = "none";
        container.appendChild(timegroup);
        
        // Create thumbnail strip inside scroll container
        const mountPoint = document.createElement("div");
        innerContent.appendChild(mountPoint);
        scrollContainer.appendChild(innerContent);
        container.appendChild(scrollContainer);
        
        const root = createRoot(mountPoint);
        root.render(
          React.createElement(ThumbnailStrip, {
            target: "react-load-test",
            style: { width: "2000px", height: "48px", position: "absolute", top: "0", left: "0" },
          })
        );
        
        await ctx.frame();
        
        const webComponent = mountPoint.querySelector("ef-thumbnail-strip") as EFThumbnailStrip | null;
        ctx.expect(webComponent).toBeDefined();
        await webComponent?.updateComplete;
        await ctx.frame();
        
        // Wait for layout and initial thumbnails to load
        // @ts-expect-error accessing private property
        if (webComponent?.thumbnailLayoutTask) {
          // @ts-expect-error accessing private property
          await webComponent.thumbnailLayoutTask.taskComplete.catch(() => {});
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await ctx.frame();
        
        // Get visible range and cached thumbnails
        // @ts-expect-error accessing private property
        const visibleRange = webComponent.getVisibleRange();
        // @ts-expect-error accessing private property
        const cachedThumbnails = webComponent._cachedThumbnails;
        
        // Filter thumbnails in visible range
        const visibleThumbnails = cachedThumbnails.filter((t: { x: number; width: number }) => {
          const thumbRight = t.x + t.width;
          return thumbRight >= visibleRange.left && t.x <= visibleRange.right;
        });
        
        // All visible thumbnails should be loaded (not missing)
        const missingVisible = visibleThumbnails.filter((t: { status: string; imageData?: unknown }) => 
          t.status === "missing" || !t.imageData
        );
        
        ctx.expect(missingVisible.length).toBe(0);
        
        // Scroll to different position
        scrollContainer.scrollLeft = 800;
        await ctx.frame();
        await ctx.frame();
        await new Promise((resolve) => setTimeout(resolve, 2000));
        
        // Check again after scroll
        // @ts-expect-error accessing private property
        const visibleRangeAfterScroll = webComponent.getVisibleRange();
        // @ts-expect-error accessing private property
        const cachedThumbnailsAfterScroll = webComponent._cachedThumbnails;
        
        const visibleThumbnailsAfterScroll = cachedThumbnailsAfterScroll.filter((t: { x: number; width: number }) => {
          const thumbRight = t.x + t.width;
          return thumbRight >= visibleRangeAfterScroll.left && t.x <= visibleRangeAfterScroll.right;
        });
        
        const missingVisibleAfterScroll = visibleThumbnailsAfterScroll.filter((t: { status: string; imageData?: unknown }) => 
          t.status === "missing" || !t.imageData
        );
        
        ctx.expect(missingVisibleAfterScroll.length).toBe(0);
      },
    },
  },
});
