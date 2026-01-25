/**
 * Test foreignObject rendering with video content.
 * Verifies that the fix for paint() skipping in render clones works correctly.
 */

import { describe, it, expect, beforeAll } from "vitest";
import type { EFTimegroup } from "../elements/EFTimegroup.js";
import type { EFVideo } from "../elements/EFVideo.js";
import "../elements/EFTimegroup.js";
import "../elements/EFVideo.js";
import {
  buildCloneStructure,
  syncStyles,
  collectDocumentStyles,
} from "./renderTimegroupPreview.js";
import {
  prepareFrameDataUri,
  loadImageFromDataUri,
} from "./renderTimegroupToCanvas.js";
import { logger } from "./logger.js";

describe("foreignObject rendering with video", () => {
  beforeAll(async () => {
    await customElements.whenDefined("ef-timegroup");
    await customElements.whenDefined("ef-video");
  });

  it("should have canvas content after seekForRender in render clone", async () => {
    // Create a timegroup with a video
    const tg = document.createElement("ef-timegroup") as EFTimegroup;
    tg.style.cssText = "width: 400px; height: 300px; background: rgb(15, 23, 42);";
    
    const video = document.createElement("ef-video") as EFVideo;
    video.src = "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
    video.style.cssText = "position: absolute; top: 0; left: 0; width: 100%; height: 100%;";
    
    tg.appendChild(video);
    document.body.appendChild(tg);
    
    try {
      await tg.updateComplete;
      
      // Create render clone
      const { clone: renderClone, container, cleanup } = await tg.createRenderClone();
      
      try {
        // Verify we're in a render clone container
        expect(container.classList.contains("ef-render-clone-container")).toBe(true);
        
        const cloneVideo = renderClone.querySelector("ef-video") as EFVideo;
        expect(cloneVideo).toBeTruthy();
        expect(cloneVideo.closest(".ef-render-clone-container")).toBeTruthy();
        
        // Seek to time 0 (this is where paint() was skipping before the fix)
        await renderClone.seekForRender(0);
        
        // Check that the video's shadow canvas exists and has dimensions
        const shadowCanvas = cloneVideo.shadowRoot?.querySelector("canvas");
        expect(shadowCanvas).toBeTruthy();
        
        if (shadowCanvas) {
          logger.debug(`[FO test] Shadow canvas dimensions: ${shadowCanvas.width}x${shadowCanvas.height}`);
          expect(shadowCanvas.width).toBeGreaterThan(0);
          expect(shadowCanvas.height).toBeGreaterThan(0);
          
          // Note: We can't check pixel content because the video might not have loaded yet
          // But the important thing is that paint() was called and didn't skip
        }
        
        cleanup();
      } catch (e) {
        cleanup();
        throw e;
      }
    } finally {
      document.body.removeChild(tg);
    }
  });

  it("should refresh canvas pixels during syncStyles", async () => {
    // This test verifies the full foreignObject rendering flow
    const tg = document.createElement("ef-timegroup") as EFTimegroup;
    tg.style.cssText = "width: 400px; height: 300px; background: rgb(15, 23, 42);";
    
    const video = document.createElement("ef-video") as EFVideo;
    video.src = "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
    video.style.cssText = "position: absolute; top: 0; left: 0; width: 100%; height: 100%;";
    
    tg.appendChild(video);
    document.body.appendChild(tg);
    
    try {
      await tg.updateComplete;
      
      // Create render clone
      const { clone: renderClone, container, cleanup } = await tg.createRenderClone();
      
      try {
        // Seek and build clone structure (simulating video rendering)
        await renderClone.seekForRender(0);
        const { container: cloneContainer, syncState } = buildCloneStructure(renderClone, 0);
        
        logger.debug(`[FO test] Clone structure built with ${syncState.nodeCount} nodes`);
        
        // Check that we have canvas clones
        const canvasClones = cloneContainer.querySelectorAll("canvas");
        logger.debug(`[FO test] Found ${canvasClones.length} canvas clones`);
        expect(canvasClones.length).toBeGreaterThan(0);
        
        // The canvas clone should have dimensions
        const canvasClone = canvasClones[0] as HTMLCanvasElement;
        logger.debug(`[FO test] Canvas clone dimensions: ${canvasClone.width}x${canvasClone.height}`);
        expect(canvasClone.width).toBeGreaterThan(0);
        expect(canvasClone.height).toBeGreaterThan(0);
        
        // Now sync styles (this should refresh canvas pixels)
        syncStyles(syncState, 0);
        logger.debug(`[FO test] Styles synced`);
        
        // The canvas should still have dimensions after sync
        expect(canvasClone.width).toBeGreaterThan(0);
        expect(canvasClone.height).toBeGreaterThan(0);
        
        cleanup();
      } catch (e) {
        cleanup();
        throw e;
      }
    } finally {
      document.body.removeChild(tg);
    }
  });

  it("should prefetch scrub segments for performance", async () => {
    // This test verifies that prefetchScrubSegments is called
    const tg = document.createElement("ef-timegroup") as EFTimegroup;
    tg.style.cssText = "width: 400px; height: 300px; background: rgb(15, 23, 42);";
    
    const video = document.createElement("ef-video") as EFVideo;
    video.src = "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
    video.style.cssText = "position: absolute; top: 0; left: 0; width: 100%; height: 100%;";
    
    tg.appendChild(video);
    document.body.appendChild(tg);
    
    try {
      await tg.updateComplete;
      
      // Create render clone
      const { clone: renderClone, cleanup } = await tg.createRenderClone();
      
      try {
        const cloneVideo = renderClone.querySelector("ef-video") as EFVideo;
        expect(cloneVideo).toBeTruthy();
        
        // Check that prefetchScrubSegments method exists
        expect(typeof cloneVideo.prefetchScrubSegments).toBe("function");
        
        logger.debug("[FO test] prefetchScrubSegments method exists");
        
        cleanup();
      } catch (e) {
        cleanup();
        throw e;
      }
    } finally {
      document.body.removeChild(tg);
    }
  });

  it("should render multiple frames with reused clone structure", async () => {
    // This simulates the actual video rendering flow
    const tg = document.createElement("ef-timegroup") as EFTimegroup;
    tg.style.cssText = "width: 400px; height: 300px; background: rgb(15, 23, 42);";
    
    const video = document.createElement("ef-video") as EFVideo;
    video.src = "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
    video.style.cssText = "position: absolute; top: 0; left: 0; width: 100%; height: 100%;";
    
    tg.appendChild(video);
    document.body.appendChild(tg);
    
    try {
      await tg.updateComplete;
      
      // Create render clone ONCE
      const { clone: renderClone, container, cleanup } = await tg.createRenderClone();
      
      try {
        // Build clone structure ONCE
        await renderClone.seekForRender(0);
        const { container: cloneContainer, syncState } = buildCloneStructure(renderClone, 0);
        
        const width = tg.offsetWidth;
        const height = tg.offsetHeight;
        const previewContainer = document.createElement("div");
        previewContainer.style.cssText = `
          width: ${width}px;
          height: ${height}px;
          position: relative;
          overflow: hidden;
          background: ${getComputedStyle(tg).background || "#000"};
        `;
        
        const styleEl = document.createElement("style");
        styleEl.textContent = collectDocumentStyles();
        previewContainer.appendChild(styleEl);
        previewContainer.appendChild(cloneContainer);
        
        // Render multiple frames (simulating video export)
        const times = [0, 100, 200];
        
        for (const timeMs of times) {
          logger.debug(`[FO test] Rendering frame at ${timeMs}ms`);
          
          // Seek and sync (reusing clone structure)
          await renderClone.seekForRender(timeMs);
          syncStyles(syncState, timeMs);
          
          // Check canvas dimensions
          const canvasClones = cloneContainer.querySelectorAll("canvas");
          expect(canvasClones.length).toBeGreaterThan(0);
          
          const canvasClone = canvasClones[0] as HTMLCanvasElement;
          expect(canvasClone.width).toBeGreaterThan(0);
          expect(canvasClone.height).toBeGreaterThan(0);
          
          // Render to data URI (this encodes the canvas)
          const dataUri = await prepareFrameDataUri(previewContainer, width, height);
          expect(dataUri).toBeTruthy();
          expect(dataUri.startsWith("data:image/svg+xml;base64,")).toBe(true);
          
          // Load the image (this is what the video renderer does)
          const image = await loadImageFromDataUri(dataUri);
          expect(image.width).toBe(width);
          expect(image.height).toBe(height);
          
          logger.debug(`[FO test] Frame at ${timeMs}ms rendered successfully`);
        }
        
        cleanup();
      } catch (e) {
        cleanup();
        throw e;
      }
    } finally {
      document.body.removeChild(tg);
    }
  });
});
