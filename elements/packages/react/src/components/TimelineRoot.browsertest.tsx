import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { assert, beforeEach, afterEach, describe, test, vi } from "vitest";
import { Timegroup, Configuration } from "../index";
import { TimelineRoot } from "./TimelineRoot";
import type { EFTimegroup } from "@editframe/elements";
import { setNativeCanvasApiEnabled, isNativeCanvasApiAvailable } from "../../../elements/src/preview/previewSettings";
import { renderTimegroupToVideo } from "../../../elements/src/preview/renderTimegroupToVideo";

// Import elements CSS to get the animations working
import "../../../elements/src/elements.css";

beforeEach(() => {
  while (document.body.children.length) {
    document.body.children[0]?.remove();
  }
});

/**
 * Simple test component that shows different colored backgrounds at different times.
 * - 0-500ms: Red background
 * - 500-1000ms: Blue background  
 * This allows us to verify that captures at different times show different content.
 */
const ColorChangingContent: React.FC = () => {
  return (
    <Timegroup mode="sequence" style={{ width: "200px", height: "100px" }}>
      <Timegroup mode="fixed" duration="500ms" style={{ background: "red", width: "100%", height: "100%" }}>
        <div>RED FRAME</div>
      </Timegroup>
      <Timegroup mode="fixed" duration="500ms" style={{ background: "blue", width: "100%", height: "100%" }}>
        <div>BLUE FRAME</div>
      </Timegroup>
    </Timegroup>
  );
};

/**
 * Test component mimicking the design catalog structure with nested timegroups.
 * Uses the same pattern as Act scenes with sequence mode and fixed children.
 */
const DesignCatalogLikeContent: React.FC = () => {
  return (
    <Timegroup 
      mode="sequence" 
      style={{ width: "400px", height: "200px", background: "#1a1a1a" }}
      className="video-container"
    >
      {/* Scene 1 - like Act06Hierarchy */}
      <Timegroup mode="sequence">
        <Timegroup mode="fixed" duration="500ms" style={{ background: "#ff0000" }}>
          <div style={{ padding: "20px", color: "white" }}>
            <h2>Scene 1 - Red</h2>
            <p>This should appear at 0-500ms</p>
          </div>
        </Timegroup>
      </Timegroup>
      
      {/* Scene 2 */}
      <Timegroup mode="sequence">
        <Timegroup mode="fixed" duration="500ms" style={{ background: "#00ff00" }}>
          <div style={{ padding: "20px", color: "white" }}>
            <h2>Scene 2 - Green</h2>
            <p>This should appear at 500-1000ms</p>
          </div>
        </Timegroup>
      </Timegroup>
      
      {/* Scene 3 */}
      <Timegroup mode="sequence">
        <Timegroup mode="fixed" duration="500ms" style={{ background: "#0000ff" }}>
          <div style={{ padding: "20px", color: "white" }}>
            <h2>Scene 3 - Blue</h2>
            <p>This should appear at 1000-1500ms</p>
          </div>
        </Timegroup>
      </Timegroup>
    </Timegroup>
  );
};

/**
 * Helper to get average color of a canvas or image
 */
function getCanvasAverageColor(source: CanvasImageSource | HTMLCanvasElement): { r: number; g: number; b: number } {
  let canvas: HTMLCanvasElement;
  
  if (source instanceof HTMLCanvasElement) {
    canvas = source;
  } else {
    // Draw to temp canvas
    canvas = document.createElement('canvas');
    canvas.width = source.width as number;
    canvas.height = source.height as number;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get canvas context");
    ctx.drawImage(source, 0, 0);
  }
  
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get canvas context");
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  let r = 0, g = 0, b = 0;
  const pixelCount = data.length / 4;
  
  for (let i = 0; i < data.length; i += 4) {
    r += data[i]!;
    g += data[i + 1]!;
    b += data[i + 2]!;
  }
  
  return {
    r: Math.round(r / pixelCount),
    g: Math.round(g / pixelCount),
    b: Math.round(b / pixelCount),
  };
}

describe("TimelineRoot", () => {
  describe("video export with native rendering", () => {
    test("renderTimegroupToVideo with React TimelineRoot + Configuration (matches design-catalog setup)", async () => {
      // Ensure native API is enabled
      setNativeCanvasApiEnabled(true);
      
      const container = document.createElement("div");
      document.body.appendChild(container);
      
      let root: Root | null = null;
      
      try {
        // Render the TimelineRoot with our test component
        root = createRoot(container);
        root.render(
          <TimelineRoot id="test-timeline" component={ColorChangingContent} />
        );
        
        // Wait for React to render and custom elements to upgrade
        await vi.waitUntil(
          () => container.querySelector("ef-timegroup") !== null,
          { timeout: 5000 }
        );
        
        // Wait for custom elements to be defined
        await customElements.whenDefined("ef-timegroup");
        
        // Find the timegroup
        const timegroup = container.querySelector("ef-timegroup") as EFTimegroup;
        assert.isNotNull(timegroup, "Timegroup should be rendered");
        
        // Wait for it to be ready
        await timegroup.updateComplete;
        await timegroup.waitForMediaDurations();
        
        // Log some debug info
        console.log("[Test] Timegroup duration:", timegroup.durationMs);
        console.log("[Test] Timegroup has initializer:", !!timegroup.initializer);
        
        // Capture at two different times: 100ms (should be red) and 600ms (should be blue)
        const timestamps = [100, 600];
        
        console.log("[Test] Starting captureBatch with timestamps:", timestamps);
        const canvases = await timegroup.captureBatch(timestamps, {
          scale: 0.5,
          contentReadyMode: "immediate",
        });
        
        assert.equal(canvases.length, 2, "Should capture 2 frames");
        
        // Get colors from both canvases
        const color1 = getCanvasAverageColor(canvases[0]!);
        const color2 = getCanvasAverageColor(canvases[1]!);
        
        console.log("[Test] Canvas 1 (100ms) average color:", color1);
        console.log("[Test] Canvas 2 (600ms) average color:", color2);
        
        // The colors should be significantly different
        // At 100ms we expect mostly red, at 600ms we expect mostly blue
        const colorDifference = Math.abs(color1.r - color2.r) + Math.abs(color1.g - color2.g) + Math.abs(color1.b - color2.b);
        console.log("[Test] Color difference:", colorDifference);
        
        // If the thumbnails are all the same (bug), the difference would be ~0
        // If working correctly, the difference should be significant (red vs blue)
        assert.isAbove(
          colorDifference, 
          50, 
          `Captures at different timestamps should have different colors. Got color1=${JSON.stringify(color1)}, color2=${JSON.stringify(color2)}`
        );
        
      } finally {
        if (root) root.unmount();
        container.remove();
      }
    }, 10000);
    
    test("captures different frames at different timestamps (design catalog like)", async () => {
      const container = document.createElement("div");
      document.body.appendChild(container);
      
      let root: Root | null = null;
      
      try {
        // Render the TimelineRoot with our design-catalog-like component
        root = createRoot(container);
        root.render(
          <TimelineRoot id="test-catalog" component={DesignCatalogLikeContent} />
        );
        
        // Wait for React to render and custom elements to upgrade
        await vi.waitUntil(
          () => container.querySelector("ef-timegroup") !== null,
          { timeout: 5000 }
        );
        
        await customElements.whenDefined("ef-timegroup");
        
        const timegroup = container.querySelector("ef-timegroup") as EFTimegroup;
        assert.isNotNull(timegroup, "Timegroup should be rendered");
        
        await timegroup.updateComplete;
        await timegroup.waitForMediaDurations();
        
        console.log("[Test Catalog] Timegroup duration:", timegroup.durationMs);
        console.log("[Test Catalog] Nested timegroups:", timegroup.querySelectorAll("ef-timegroup").length);
        
        // Capture at three different times: 100ms (red), 600ms (green), 1100ms (blue)
        const timestamps = [100, 600, 1100];
        
        console.log("[Test Catalog] Starting captureBatch with timestamps:", timestamps);
        const canvases = await timegroup.captureBatch(timestamps, {
          scale: 0.5,
          contentReadyMode: "immediate",
        });
        
        assert.equal(canvases.length, 3, "Should capture 3 frames");
        
        // Get colors from all canvases
        const colors = canvases.map(c => getCanvasAverageColor(c));
        
        console.log("[Test Catalog] Canvas 1 (100ms) color:", colors[0]);
        console.log("[Test Catalog] Canvas 2 (600ms) color:", colors[1]);
        console.log("[Test Catalog] Canvas 3 (1100ms) color:", colors[2]);
        
        // Verify each capture has significantly different dominant color
        // Frame 1 should be predominantly red
        // Frame 2 should be predominantly green  
        // Frame 3 should be predominantly blue
        
        // Calculate differences between consecutive frames
        const diff12 = Math.abs(colors[0]!.r - colors[1]!.r) + Math.abs(colors[0]!.g - colors[1]!.g) + Math.abs(colors[0]!.b - colors[1]!.b);
        const diff23 = Math.abs(colors[1]!.r - colors[2]!.r) + Math.abs(colors[1]!.g - colors[2]!.g) + Math.abs(colors[1]!.b - colors[2]!.b);
        
        console.log("[Test Catalog] Color diff 1-2:", diff12);
        console.log("[Test Catalog] Color diff 2-3:", diff23);
        
        // If thumbnails are all the same (bug), differences would be ~0
        assert.isAbove(diff12, 30, `Frames 1 and 2 should have different colors`);
        assert.isAbove(diff23, 30, `Frames 2 and 3 should have different colors`);
        
      } finally {
        if (root) root.unmount();
        container.remove();
      }
    }, 10000);
    
    test("clone is created with React content that responds to seek", async () => {
      const container = document.createElement("div");
      document.body.appendChild(container);
      
      let root: Root | null = null;
      
      try {
        // Render the TimelineRoot
        root = createRoot(container);
        root.render(
          <TimelineRoot id="test-timeline-2" component={ColorChangingContent} />
        );
        
        // Wait for render
        await vi.waitUntil(
          () => container.querySelector("ef-timegroup") !== null,
          { timeout: 5000 }
        );
        
        await customElements.whenDefined("ef-timegroup");
        
        const timegroup = container.querySelector("ef-timegroup") as EFTimegroup;
        await timegroup.updateComplete;
        await timegroup.waitForMediaDurations();
        
        console.log("[Test] Creating render clone...");
        
        // Create a render clone
        const { clone, cleanup } = await timegroup.createRenderClone();
        
        console.log("[Test] Clone created. Duration:", clone.durationMs);
        console.log("[Test] Clone isRootTimegroup:", clone.isRootTimegroup);
        
        // Verify clone has content
        const cloneChildren = clone.querySelectorAll("ef-timegroup");
        console.log("[Test] Clone has", cloneChildren.length, "nested timegroups");
        
        // Seek to different times and check currentTimeMs updates
        await clone.seek(0);
        console.log("[Test] After seek(0), clone.currentTimeMs:", clone.currentTimeMs);
        assert.equal(clone.currentTimeMs, 0, "Clone should be at time 0");
        
        await clone.seek(600);
        console.log("[Test] After seek(600), clone.currentTimeMs:", clone.currentTimeMs);
        assert.equal(clone.currentTimeMs, 600, "Clone should be at time 600");
        
        cleanup();
        
      } finally {
        if (root) root.unmount();
        container.remove();
      }
    }, 10000);
    
    test("captures different frames using NATIVE path (verified)", async () => {
      // Ensure native API is enabled
      setNativeCanvasApiEnabled(true);
      
      const container = document.createElement("div");
      document.body.appendChild(container);
      
      let root: Root | null = null;
      
      try {
        // Render the TimelineRoot with our test component
        root = createRoot(container);
        root.render(
          <TimelineRoot id="test-native" component={ColorChangingContent} />
        );
        
        // Wait for React to render and custom elements to upgrade
        await vi.waitUntil(
          () => container.querySelector("ef-timegroup") !== null,
          { timeout: 5000 }
        );
        
        await customElements.whenDefined("ef-timegroup");
        
        const timegroup = container.querySelector("ef-timegroup") as EFTimegroup;
        assert.isNotNull(timegroup, "Timegroup should be rendered");
        
        await timegroup.updateComplete;
        await timegroup.waitForMediaDurations();
        
        // Verify native API is actually available
        assert.isTrue(isNativeCanvasApiAvailable(), "Native canvas API should be available");
        
        console.log("[Test Native] Timegroup duration:", timegroup.durationMs);
        console.log("[Test Native] Native API available:", isNativeCanvasApiAvailable());
        
        // Capture at two different times: 100ms (should be red) and 600ms (should be blue)
        const timestamps = [100, 600];
        
        console.log("[Test Native] Starting captureBatch with timestamps:", timestamps);
        const canvases = await timegroup.captureBatch(timestamps, {
          scale: 0.5,
          contentReadyMode: "immediate",
        });
        
        assert.equal(canvases.length, 2, "Should capture 2 frames");
        
        // Get colors from both canvases
        const color1 = getCanvasAverageColor(canvases[0]!);
        const color2 = getCanvasAverageColor(canvases[1]!);
        
        console.log("[Test Native] Canvas 1 (100ms) average color:", color1);
        console.log("[Test Native] Canvas 2 (600ms) average color:", color2);
        
        // The colors should be significantly different
        const colorDifference = Math.abs(color1.r - color2.r) + Math.abs(color1.g - color2.g) + Math.abs(color1.b - color2.b);
        console.log("[Test Native] Color difference:", colorDifference);
        
        assert.isAbove(
          colorDifference, 
          50, 
          `Native: Captures at different timestamps should have different colors. Got color1=${JSON.stringify(color1)}, color2=${JSON.stringify(color2)}`
        );
        
      } finally {
        if (root) root.unmount();
        container.remove();
      }
    }, 10000);
    
    test("captures different frames using FOREIGNOBJECT path (forced)", async () => {
      // Force foreignObject path by disabling native API
      const wasEnabled = isNativeCanvasApiAvailable();
      setNativeCanvasApiEnabled(false);
      
      const container = document.createElement("div");
      document.body.appendChild(container);
      
      let root: Root | null = null;
      
      try {
        // Render the TimelineRoot with our test component
        root = createRoot(container);
        root.render(
          <TimelineRoot id="test-foreignobject" component={ColorChangingContent} />
        );
        
        // Wait for React to render and custom elements to upgrade
        await vi.waitUntil(
          () => container.querySelector("ef-timegroup") !== null,
          { timeout: 5000 }
        );
        
        await customElements.whenDefined("ef-timegroup");
        
        const timegroup = container.querySelector("ef-timegroup") as EFTimegroup;
        assert.isNotNull(timegroup, "Timegroup should be rendered");
        
        await timegroup.updateComplete;
        await timegroup.waitForMediaDurations();
        
        console.log("[Test ForeignObject] Timegroup duration:", timegroup.durationMs);
        console.log("[Test ForeignObject] Using foreignObject path (native disabled)");
        
        // Capture at two different times: 100ms (should be red) and 600ms (should be blue)
        const timestamps = [100, 600];
        
        console.log("[Test ForeignObject] Starting captureBatch with timestamps:", timestamps);
        const canvases = await timegroup.captureBatch(timestamps, {
          scale: 0.5,
          contentReadyMode: "immediate",
        });
        
        assert.equal(canvases.length, 2, "Should capture 2 frames");
        
        // Get colors from both canvases
        const color1 = getCanvasAverageColor(canvases[0]!);
        const color2 = getCanvasAverageColor(canvases[1]!);
        
        console.log("[Test ForeignObject] Canvas 1 (100ms) average color:", color1);
        console.log("[Test ForeignObject] Canvas 2 (600ms) average color:", color2);
        
        // The colors should be significantly different
        const colorDifference = Math.abs(color1.r - color2.r) + Math.abs(color1.g - color2.g) + Math.abs(color1.b - color2.b);
        console.log("[Test ForeignObject] Color difference:", colorDifference);
        
        assert.isAbove(
          colorDifference, 
          50, 
          `ForeignObject: Captures at different timestamps should have different colors. Got color1=${JSON.stringify(color1)}, color2=${JSON.stringify(color2)}`
        );
        
      } finally {
        // Restore native API setting
        if (wasEnabled) {
          setNativeCanvasApiEnabled(true);
        }
        if (root) root.unmount();
        container.remove();
      }
    }, 10000);
  });
  
  describe("video export with native rendering", () => {
    test("renderTimegroupToVideo with React TimelineRoot + Configuration (matches design-catalog setup)", async () => {
      // Ensure native API is enabled
      setNativeCanvasApiEnabled(true);
      
      const container = document.createElement("div");
      document.body.appendChild(container);
      
      let root: Root | null = null;
      
      try {
        // Render with Configuration wrapper (matches design-catalog/main.tsx structure)
        root = createRoot(container);
        root.render(
          <Configuration apiHost="http://localhost:3000" debug>
            <TimelineRoot id="root-timegroup" component={ColorChangingContent} />
          </Configuration>
        );
        
        // Wait for React to render and custom elements to upgrade
        await vi.waitUntil(
          () => container.querySelector("ef-timegroup") !== null,
          { timeout: 5000 }
        );
        
        await customElements.whenDefined("ef-timegroup");
        
        const timegroup = container.querySelector("ef-timegroup") as EFTimegroup;
        assert.isNotNull(timegroup, "Timegroup should be rendered");
        
        await timegroup.updateComplete;
        await timegroup.waitForMediaDurations();
        
        // Verify native API is actually available
        assert.isTrue(isNativeCanvasApiAvailable(), "Native canvas API should be available");
        
        console.log("[Video Export Test] Timegroup duration:", timegroup.durationMs);
        console.log("[Video Export Test] Native API available:", isNativeCanvasApiAvailable());
        console.log("[Video Export Test] Timegroup has initializer:", !!timegroup.initializer);
        
        // Attempt video export with native rendering
        // This should NOT throw "Failed to execute 'drawElementImage'... must have been laid out"
        const videoBuffer = await renderTimegroupToVideo(timegroup, {
          fps: 10,
          scale: 0.5,
          fromMs: 0,
          toMs: 1000,
          returnBuffer: true,
          streaming: false,
          includeAudio: false,
        });
        
        assert.isDefined(videoBuffer, "Video buffer should be created");
        assert.isAbove(videoBuffer!.length, 1000, "Video buffer should have content");
        
        console.log("[Video Export Test] Video export succeeded, buffer size:", videoBuffer!.length);
        
      } catch (error: any) {
        // Check if it's the specific layout error we're trying to reproduce
        if (error.message?.includes("drawElementImage") && error.message?.includes("laid out")) {
          console.error("[Video Export Test] REPRODUCED ERROR:", error.message);
          console.error("[Video Export Test] Stack:", error.stack);
          throw error; // Re-throw to fail the test
        }
        // Re-throw any other errors
        throw error;
      } finally {
        if (root) root.unmount();
        container.remove();
      }
    }, 30000);
  });
});

