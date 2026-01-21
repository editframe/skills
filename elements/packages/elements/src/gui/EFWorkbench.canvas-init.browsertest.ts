import { html, render } from "lit";
import { afterEach, beforeEach, describe, test } from "vitest";
import type { EFWorkbench } from "./EFWorkbench.js";
import "./EFWorkbench.js";
import "../elements/EFTimegroup.js";
import { setEFInteractive } from "../EF_INTERACTIVE.js";
import {
  setPreviewPresentationMode,
  setRenderMode,
  type RenderMode,
  type PreviewPresentationMode,
} from "../preview/previewSettings.js";
import type { EFTimegroup } from "../elements/EFTimegroup.js";

/**
 * Check if a canvas has non-empty content (non-transparent pixels).
 * This is used to verify that the canvas has actually rendered content.
 */
function canvasHasContent(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  
  // Sample pixels from center region (faster than checking all pixels)
  const sampleSize = Math.min(100, Math.floor(canvas.width / 4), Math.floor(canvas.height / 4));
  const startX = Math.floor((canvas.width - sampleSize) / 2);
  const startY = Math.floor((canvas.height - sampleSize) / 2);
  
  const imageData = ctx.getImageData(startX, startY, sampleSize, sampleSize);
  
  // Check if any pixel is non-transparent/non-black
  for (let i = 0; i < imageData.data.length; i += 4) {
    const r = imageData.data[i]!;
    const g = imageData.data[i + 1]!;
    const b = imageData.data[i + 2]!;
    const a = imageData.data[i + 3]!;
    
    // Consider pixel "content" if it has alpha and is not pure black
    if (a > 0 && (r > 10 || g > 10 || b > 10)) {
      return true;
    }
  }
  return false;
}

/**
 * Wait for canvas to have content, with timeout.
 * Useful for testing async initialization.
 */
async function waitForCanvasContent(
  canvas: HTMLCanvasElement,
  timeoutMs: number = 5000,
): Promise<boolean> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    if (canvasHasContent(canvas)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return false;
}

/**
 * Get the canvas element from workbench's shadow DOM.
 */
function getWorkbenchCanvas(workbench: EFWorkbench): HTMLCanvasElement | null {
  const shadowRoot = workbench.shadowRoot;
  if (!shadowRoot) return null;
  
  // Canvas container has class "clone-overlay" and is visible when presentationMode is "canvas"
  // Find all clone-overlay divs and check which one is visible (has display: block)
  const overlays = shadowRoot.querySelectorAll(".clone-overlay");
  let canvasContainer: HTMLElement | null = null;
  
  for (const overlay of overlays) {
    const style = window.getComputedStyle(overlay as HTMLElement);
    if (style.display === "block") {
      canvasContainer = overlay as HTMLElement;
      break;
    }
  }
  
  if (!canvasContainer) return null;
  
  // Canvas is inside a wrapper div (created by renderTimegroupToCanvas)
  // Structure: container > wrapper div > canvas
  const canvasWrapper = canvasContainer.querySelector("div");
  if (!canvasWrapper) return null;
  
  return canvasWrapper.querySelector("canvas");
}

/**
 * Wait for canvas to appear in workbench, with timeout.
 */
async function waitForWorkbenchCanvas(
  workbench: EFWorkbench,
  timeoutMs: number = 5000,
): Promise<HTMLCanvasElement | null> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    const canvas = getWorkbenchCanvas(workbench);
    if (canvas) {
      return canvas;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return null;
}

describe("EFWorkbench Canvas Mode Initialization", () => {
  let container: HTMLDivElement;
  let originalPresentationMode: PreviewPresentationMode;
  let originalRenderMode: RenderMode;

  beforeEach(() => {
    // Save original values
    originalPresentationMode = localStorage.getItem("ef-preview-presentation-mode") as PreviewPresentationMode || "original";
    originalRenderMode = localStorage.getItem("ef-preview-render-mode") as RenderMode || "foreignObject";

    // Enable interactive mode for workbench wrapping
    setEFInteractive(true);

    // Clear localStorage
    localStorage.clear();

    // Clean DOM
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    // Restore original values
    setPreviewPresentationMode(originalPresentationMode);
    setRenderMode(originalRenderMode);
    
    // Clean up
    container.remove();
    document.body.innerHTML = "";
    localStorage.clear();
  });

  describe("Rendering Mode Tests", () => {
    test("canvas mode renders first frame in native mode with autoInit", async ({ expect }) => {
      // Set presentation mode to canvas
      setPreviewPresentationMode("canvas");
      setRenderMode("native");

      // Create timegroup with test content
      render(
        html`
          <ef-timegroup
            id="test-timegroup"
            workbench
            mode="fixed"
            duration="2s"
            auto-init
            style="width: 500px; height: 500px; background: rgb(255, 0, 0);"
          >
            <div style="width: 100%; height: 100%; background: rgb(0, 255, 0); display: flex; align-items: center; justify-content: center;">
              <h1 style="color: white;">Test Content</h1>
            </div>
          </ef-timegroup>
        `,
        container,
      );

      // Wait for workbench to wrap
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      const timegroup = document.querySelector("ef-timegroup") as EFTimegroup;
      expect(timegroup).toBeTruthy();
      
      const workbench = timegroup.closest("ef-workbench") as EFWorkbench;
      expect(workbench).toBeTruthy();

      // Wait for workbench to initialize
      await workbench.updateComplete;
      
      // Wait for canvas mode to initialize (may be async)
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Wait for media durations and initial seek
      if (timegroup.isRootTimegroup) {
        await timegroup.waitForMediaDurations().catch(() => {});
        await timegroup.seek(0).catch(() => {});
      }

      // Wait for canvas to appear and render
      const canvas = await waitForWorkbenchCanvas(workbench, 3000);
      expect(canvas).toBeTruthy();
      
      if (canvas) {
        const hasContent = await waitForCanvasContent(canvas, 3000);
        expect(hasContent).toBe(true);
        expect(canvas.width).toBeGreaterThan(0);
        expect(canvas.height).toBeGreaterThan(0);
      }
    });

    test("canvas mode renders first frame in foreignObject mode with autoInit", async ({ expect }) => {
      // Set presentation mode to canvas
      setPreviewPresentationMode("canvas");
      setRenderMode("foreignObject");

      // Create timegroup with test content
      render(
        html`
          <ef-timegroup
            id="test-timegroup"
            workbench
            mode="fixed"
            duration="2s"
            auto-init
            style="width: 500px; height: 500px; background: rgb(255, 0, 0);"
          >
            <div style="width: 100%; height: 100%; background: rgb(0, 255, 0); display: flex; align-items: center; justify-content: center;">
              <h1 style="color: white;">Test Content</h1>
            </div>
          </ef-timegroup>
        `,
        container,
      );

      // Wait for workbench to wrap
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      const timegroup = document.querySelector("ef-timegroup") as EFTimegroup;
      expect(timegroup).toBeTruthy();
      
      const workbench = timegroup.closest("ef-workbench") as EFWorkbench;
      expect(workbench).toBeTruthy();

      // Wait for workbench to initialize
      await workbench.updateComplete;
      
      // Wait for canvas mode to initialize
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Wait for media durations and initial seek
      if (timegroup.isRootTimegroup) {
        await timegroup.waitForMediaDurations().catch(() => {});
        await timegroup.seek(0).catch(() => {});
      }

      // Wait for canvas to appear and render
      const canvas = await waitForWorkbenchCanvas(workbench, 3000);
      expect(canvas).toBeTruthy();
      
      if (canvas) {
        const hasContent = await waitForCanvasContent(canvas, 3000);
        expect(hasContent).toBe(true);
        expect(canvas.width).toBeGreaterThan(0);
        expect(canvas.height).toBeGreaterThan(0);
      }
    });

    test("canvas mode renders first frame in native mode without autoInit", async ({ expect }) => {
      // Set presentation mode to canvas
      setPreviewPresentationMode("canvas");
      setRenderMode("native");

      // Create timegroup without autoInit
      render(
        html`
          <ef-timegroup
            id="test-timegroup"
            mode="fixed"
            duration="2s"
            style="width: 500px; height: 500px; background: rgb(255, 0, 0);"
          >
            <div style="width: 100%; height: 100%; background: rgb(0, 255, 0); display: flex; align-items: center; justify-content: center;">
              <h1 style="color: white;">Test Content</h1>
            </div>
          </ef-timegroup>
        `,
        container,
      );

      // Wait for workbench to wrap
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      const timegroup = document.querySelector("ef-timegroup") as EFTimegroup;
      expect(timegroup).toBeTruthy();
      
      const workbench = timegroup.closest("ef-workbench") as EFWorkbench;
      expect(workbench).toBeTruthy();

      // Wait for workbench to initialize
      await workbench.updateComplete;
      
      // Wait for canvas mode to initialize
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Manually seek to frame 0 (since autoInit is disabled)
      if (timegroup.isRootTimegroup) {
        await timegroup.waitForMediaDurations().catch(() => {});
        await timegroup.seek(0).catch(() => {});
      }

      // Wait for canvas to appear and render
      const canvas = await waitForWorkbenchCanvas(workbench, 3000);
      expect(canvas).toBeTruthy();
      
      if (canvas) {
        const hasContent = await waitForCanvasContent(canvas, 3000);
        expect(hasContent).toBe(true);
      }
    });

    test("canvas mode renders first frame in foreignObject mode without autoInit", async ({ expect }) => {
      // Set presentation mode to canvas
      setPreviewPresentationMode("canvas");
      setRenderMode("foreignObject");

      // Create timegroup without autoInit
      render(
        html`
          <ef-timegroup
            id="test-timegroup"
            mode="fixed"
            duration="2s"
            style="width: 500px; height: 500px; background: rgb(255, 0, 0);"
          >
            <div style="width: 100%; height: 100%; background: rgb(0, 255, 0); display: flex; align-items: center; justify-content: center;">
              <h1 style="color: white;">Test Content</h1>
            </div>
          </ef-timegroup>
        `,
        container,
      );

      // Wait for workbench to wrap
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      const timegroup = document.querySelector("ef-timegroup") as EFTimegroup;
      expect(timegroup).toBeTruthy();
      
      const workbench = timegroup.closest("ef-workbench") as EFWorkbench;
      expect(workbench).toBeTruthy();

      // Wait for workbench to initialize
      await workbench.updateComplete;
      
      // Wait for canvas mode to initialize
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Manually seek to frame 0
      if (timegroup.isRootTimegroup) {
        await timegroup.waitForMediaDurations().catch(() => {});
        await timegroup.seek(0).catch(() => {});
      }

      // Wait for canvas to appear and render
      const canvas = await waitForWorkbenchCanvas(workbench, 3000);
      expect(canvas).toBeTruthy();
      
      if (canvas) {
        const hasContent = await waitForCanvasContent(canvas, 3000);
        expect(hasContent).toBe(true);
      }
    });

    test("DOM mode renders content directly (no canvas)", async ({ expect }) => {
      // Set presentation mode to original (DOM mode)
      setPreviewPresentationMode("original");

      // Create timegroup
      render(
        html`
          <ef-timegroup
            id="test-timegroup"
            workbench
            mode="fixed"
            duration="2s"
            auto-init
            style="width: 500px; height: 500px; background: rgb(255, 0, 0);"
          >
            <div style="width: 100%; height: 100%; background: rgb(0, 255, 0); display: flex; align-items: center; justify-content: center;">
              <h1 style="color: white;">Test Content</h1>
            </div>
          </ef-timegroup>
        `,
        container,
      );

      // Wait for workbench to wrap
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      const timegroup = document.querySelector("ef-timegroup") as EFTimegroup;
      expect(timegroup).toBeTruthy();
      
      const workbench = timegroup.closest("ef-workbench") as EFWorkbench;
      expect(workbench).toBeTruthy();

      // Wait for workbench to initialize
      await workbench.updateComplete;
      
      // Wait for initial seek
      if (timegroup.isRootTimegroup) {
        await timegroup.waitForMediaDurations().catch(() => {});
        await timegroup.seek(0).catch(() => {});
      }

      // In DOM mode, content should be visible directly
      const contentDiv = timegroup.querySelector("div");
      expect(contentDiv).toBeTruthy();
      
      // Canvas should not exist in DOM mode
      const canvas = getWorkbenchCanvas(workbench);
      expect(canvas).toBeFalsy();
    });
  });

  describe("Initialization Race Condition Tests", () => {
    test("canvas renders after workbench wraps timegroup", async ({ expect }) => {
      setPreviewPresentationMode("canvas");
      setRenderMode("foreignObject");

      // Create timegroup - workbench will wrap it
      render(
        html`
          <ef-timegroup
            id="test-timegroup"
            mode="fixed"
            duration="2s"
            auto-init
            style="width: 500px; height: 500px; background: rgb(128, 128, 255);"
          >
            <div style="width: 100%; height: 100%; background: rgb(255, 128, 128);">
              Content
            </div>
          </ef-timegroup>
        `,
        container,
      );

      // Wait for wrapping and initialization
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      const timegroup = document.querySelector("ef-timegroup") as EFTimegroup;
      const workbench = timegroup?.closest("ef-workbench") as EFWorkbench;
      
      expect(workbench).toBeTruthy();
      await workbench?.updateComplete;
      
      // Wait for initialization sequence
      await new Promise((resolve) => setTimeout(resolve, 200));
      
      if (timegroup?.isRootTimegroup) {
        await timegroup.waitForMediaDurations().catch(() => {});
        await timegroup.seek(0).catch(() => {});
      }
      
      await new Promise((resolve) => setTimeout(resolve, 500));

      const canvas = getWorkbenchCanvas(workbench!);
      expect(canvas).toBeTruthy();
      
      if (canvas) {
        const hasContent = await waitForCanvasContent(canvas, 3000);
        expect(hasContent).toBe(true);
      }
    });

    test("canvas renders with pure DOM content (no media)", async ({ expect }) => {
      setPreviewPresentationMode("canvas");
      setRenderMode("foreignObject");

      // Create timegroup with only DOM content (no media elements)
      render(
        html`
          <ef-timegroup
            id="test-timegroup"
            mode="fixed"
            duration="2s"
            auto-init
            style="width: 500px; height: 500px; background: rgb(200, 200, 200);"
          >
            <div style="width: 200px; height: 200px; background: rgb(100, 150, 200); margin: 50px;">
              Pure DOM Content
            </div>
          </ef-timegroup>
        `,
        container,
      );

      await new Promise((resolve) => setTimeout(resolve, 100));
      
      const timegroup = document.querySelector("ef-timegroup") as EFTimegroup;
      const workbench = timegroup?.closest("ef-workbench") as EFWorkbench;
      
      expect(workbench).toBeTruthy();
      await workbench?.updateComplete;
      
      await new Promise((resolve) => setTimeout(resolve, 200));
      
      if (timegroup?.isRootTimegroup) {
        await timegroup.waitForMediaDurations().catch(() => {});
        await timegroup.seek(0).catch(() => {});
      }
      
      await new Promise((resolve) => setTimeout(resolve, 500));

      const canvas = getWorkbenchCanvas(workbench!);
      expect(canvas).toBeTruthy();
      
      if (canvas) {
        const hasContent = await waitForCanvasContent(canvas, 3000);
        expect(hasContent).toBe(true);
      }
    });
  });

  describe("Visual Verification Tests", () => {
    test("canvas updates when timegroup seeks", async ({ expect }) => {
      setPreviewPresentationMode("canvas");
      setRenderMode("foreignObject");

      render(
        html`
          <ef-timegroup
            id="test-timegroup"
            mode="fixed"
            duration="2s"
            style="width: 500px; height: 500px; background: rgb(255, 0, 0);"
          >
            <div style="width: 100%; height: 100%; background: rgb(0, 255, 0);">
              Frame 0
            </div>
          </ef-timegroup>
        `,
        container,
      );

      await new Promise((resolve) => setTimeout(resolve, 100));
      
      const timegroup = document.querySelector("ef-timegroup") as EFTimegroup;
      const workbench = timegroup?.closest("ef-workbench") as EFWorkbench;
      
      await workbench?.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 200));
      
      if (timegroup?.isRootTimegroup) {
        await timegroup.waitForMediaDurations().catch(() => {});
        await timegroup.seek(0).catch(() => {});
      }
      
      // Wait for canvas to appear and render
      const canvas = await waitForWorkbenchCanvas(workbench!, 3000);
      expect(canvas).toBeTruthy();
      
      if (canvas) {
        // Verify initial frame renders
        const hasInitialContent = await waitForCanvasContent(canvas, 3000);
        expect(hasInitialContent).toBe(true);
        
        // Seek to middle of timeline
        await timegroup!.seek(1000);
        await new Promise((resolve) => setTimeout(resolve, 300));
        
        // Canvas should still have content after seek
        const hasContentAfterSeek = canvasHasContent(canvas);
        expect(hasContentAfterSeek).toBe(true);
      }
    });

    test("canvas renders correctly after mode switch", async ({ expect }) => {
      // Start in DOM mode
      setPreviewPresentationMode("original");

      render(
        html`
          <ef-timegroup
            id="test-timegroup"
            workbench
            mode="fixed"
            duration="2s"
            auto-init
            style="width: 500px; height: 500px; background: rgb(255, 0, 0);"
          >
            <div style="width: 100%; height: 100%; background: rgb(0, 255, 0);">
              Content
            </div>
          </ef-timegroup>
        `,
        container,
      );

      await new Promise((resolve) => setTimeout(resolve, 100));
      
      const timegroup = document.querySelector("ef-timegroup") as EFTimegroup;
      const workbench = timegroup?.closest("ef-workbench") as EFWorkbench;
      
      await workbench?.updateComplete;
      
      if (timegroup?.isRootTimegroup) {
        await timegroup.waitForMediaDurations().catch(() => {});
        await timegroup.seek(0).catch(() => {});
      }

      // Switch to canvas mode
      setPreviewPresentationMode("canvas");
      setRenderMode("foreignObject");
      
      // Trigger mode change
      await workbench?.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 200));
      
      // Wait for canvas to appear and render
      const canvas = await waitForWorkbenchCanvas(workbench!, 3000);
      expect(canvas).toBeTruthy();
      
      if (canvas) {
        const hasContent = await waitForCanvasContent(canvas, 3000);
        expect(hasContent).toBe(true);
      }
    });
  });
});
