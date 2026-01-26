/**
 * Implementation and measurement of observer-based style sync.
 * 
 * Tests element-level dirty tracking to skip unchanged elements.
 * Compares actual performance vs current approach.
 * 
 * Run with:
 *   cd elements && ./scripts/browsertest src/preview/style-observer-implementation.browsertest.ts
 */

import { html, render } from "lit";
import { beforeAll, describe, expect, test } from "vitest";
import { CSSStyleObserver } from "@bramus/style-observer";

import { getApiHost } from "../../test/setup.js";
import type { EFTimegroup } from "../elements/EFTimegroup.js";
import { 
  buildCloneStructure, 
  syncStyles,
  type SyncState,
  type CloneNode,
  traverseCloneTree,
} from "./renderTimegroupPreview.js";
import "../elements/EFTimegroup.js";
import "../elements/EFVideo.js";

const SYNC_PROPERTIES = [
  "display", "visibility", "opacity",
  "position", "top", "right", "bottom", "left", "zIndex",
  "width", "height", "minWidth", "minHeight", "maxWidth", "maxHeight",
  "flex", "flexFlow", "justifyContent", "alignItems", "alignContent", "alignSelf", "gap",
  "gridTemplate", "gridColumn", "gridRow", "gridArea",
  "margin", "padding", "boxSizing",
  "border", "borderTop", "borderRight", "borderBottom", "borderLeft", "borderRadius",
  "background", "color", "boxShadow", "filter", "backdropFilter", "clipPath",
  "font", "textAlign", "textDecoration", "textTransform",
  "letterSpacing", "whiteSpace", "textOverflow", "lineHeight",
  "transform", "transformOrigin", "transformStyle",
  "perspective", "perspectiveOrigin", "backfaceVisibility",
  "cursor", "pointerEvents", "userSelect", "overflow",
] as const;

beforeAll(async () => {
  console.clear();
  await fetch("/@ef-clear-cache", { method: "DELETE" });
});

/**
 * Extended SyncState with observer support
 */
interface ObserverSyncState extends SyncState {
  observers?: Map<Element, CSSStyleObserver>;
  dirtyElements?: Set<Element>;
  observerStats?: {
    totalCallbacks: number;
    dirtyElementCount: number;
  };
}

/**
 * Build clone structure WITH observer-based dirty tracking
 */
function buildCloneStructureWithObservers(
  source: Element,
  timeMs: number
): { container: HTMLDivElement; syncState: ObserverSyncState } {
  // Build normal structure first
  const result = buildCloneStructure(source, timeMs);
  const syncState = result.syncState as ObserverSyncState;
  
  // Add observer tracking
  syncState.observers = new Map();
  syncState.dirtyElements = new Set();
  syncState.observerStats = {
    totalCallbacks: 0,
    dirtyElementCount: 0,
  };
  
  // Attach observers to all source elements
  traverseCloneTree(syncState, (node) => {
    // Skip SVG elements and canvas clones
    if (node.source instanceof SVGElement || node.isCanvasClone) {
      return;
    }
    
    try {
      const observer = new CSSStyleObserver(
        SYNC_PROPERTIES,
        () => {
          syncState.observerStats!.totalCallbacks++;
          if (!syncState.dirtyElements!.has(node.source)) {
            syncState.dirtyElements!.add(node.source);
            syncState.observerStats!.dirtyElementCount++;
          }
        }
      );
      observer.attach(node.source);
      syncState.observers!.set(node.source, observer);
    } catch (e) {
      // Some elements might not support observation
    }
  });
  
  return { container: result.container, syncState };
}

/**
 * Sync styles using observer-based dirty tracking
 */
function syncStylesWithObservers(state: ObserverSyncState, timeMs: number): void {
  // First do visibility updates (same as current system)
  syncStyles(state, timeMs);
  
  // Track performance - in a real implementation, we'd integrate dirty checking
  // into syncNodeWithDelta to actually skip getComputedStyle calls
  // For now, measure the potential
  
  // DON'T clear dirty flags here - let them accumulate to see the tracking working
  // state.dirtyElements?.clear();
}

/**
 * Cleanup observers
 */
function cleanupObservers(state: ObserverSyncState): void {
  if (state.observers) {
    for (const observer of state.observers.values()) {
      observer.detach();
    }
    state.observers.clear();
  }
}

describe("Observer-Based Style Sync", () => {
  test("Measure setup overhead", async () => {
    const container = document.createElement("div");
    const apiHost = getApiHost();
    
    // Create scene with varying complexity
    const elementCounts = [5, 10, 20, 50];
    
    console.log(`\n=== Observer Setup Overhead ===`);
    
    for (const count of elementCounts) {
      render(
        html`
        <ef-configuration api-host="${apiHost}" signing-url="">
          <ef-timegroup mode="contain" style="width: 800px; height: 450px; background: #000;">
            ${Array.from({ length: count }, (_, i) => html`
              <div style="position: absolute; top: ${i * 10}px; left: 50px; width: 100px; height: 20px; background: red;"></div>
            `)}
          </ef-timegroup>
        </ef-configuration>
      `,
        container,
      );
      document.body.appendChild(container);
      
      const timegroup = container.querySelector("ef-timegroup") as EFTimegroup;
      await timegroup.updateComplete;
      
      // Measure without observers
      const t0 = performance.now();
      const { syncState: normalState } = buildCloneStructure(timegroup, 0);
      const normalTime = performance.now() - t0;
      
      // Measure with observers
      const t1 = performance.now();
      const { syncState: observerState } = buildCloneStructureWithObservers(timegroup, 0);
      const observerTime = performance.now() - t1;
      
      const overhead = observerTime - normalTime;
      const perElementOverhead = overhead / count;
      
      console.log(`\n${count} elements:`);
      console.log(`  Without observers: ${normalTime.toFixed(2)}ms`);
      console.log(`  With observers: ${observerTime.toFixed(2)}ms`);
      console.log(`  Overhead: ${overhead.toFixed(2)}ms (${perElementOverhead.toFixed(3)}ms per element)`);
      
      cleanupObservers(observerState as ObserverSyncState);
      container.remove();
    }
  });
  
  test("Measure sync performance: mostly static scene", async () => {
    const container = document.createElement("div");
    const apiHost = getApiHost();
    
    // 20 static elements, 2 animated elements
    render(
      html`
      <ef-configuration api-host="${apiHost}" signing-url="">
        <ef-timegroup mode="contain" style="width: 800px; height: 450px; background: #000;">
          ${Array.from({ length: 20 }, (_, i) => html`
            <div class="static" style="position: absolute; top: ${i * 20}px; left: 50px; width: 200px; height: 15px; background: rgba(255,255,255,0.3);">
              Static ${i}
            </div>
          `)}
          <div id="anim-1" style="position: absolute; top: 50%; left: 25%; width: 100px; height: 100px; background: red;"></div>
          <div id="anim-2" style="position: absolute; top: 50%; right: 25%; width: 100px; height: 100px; background: blue;"></div>
        </ef-timegroup>
      </ef-configuration>
    `,
      container,
    );
    document.body.appendChild(container);
    
    const timegroup = container.querySelector("ef-timegroup") as EFTimegroup;
    const anim1 = container.querySelector("#anim-1") as HTMLElement;
    const anim2 = container.querySelector("#anim-2") as HTMLElement;
    await timegroup.updateComplete;
    
    console.log(`\n=== Mostly Static Scene (20 static, 2 animated) ===`);
    
    const frames = 100;
    
    // Test 1: Current approach (no observers)
    const { syncState: normalState } = buildCloneStructure(timegroup, 0);
    let normalTime = 0;
    
    for (let i = 0; i < frames; i++) {
      // Animate 2 elements
      anim1.style.transform = `translate(-50%, -50%) rotate(${i * 3.6}deg)`;
      anim2.style.transform = `translate(50%, -50%) rotate(${-i * 3.6}deg)`;
      
      const start = performance.now();
      syncStyles(normalState, i * 33);
      normalTime += performance.now() - start;
    }
    
    // Test 2: With observers
    const { syncState: observerState } = buildCloneStructureWithObservers(timegroup, 0);
    const setupTime = 0; // Already included in build
    let observerSyncTime = 0;
    let totalCallbacks = 0;
    let totalDirtyElements = 0;
    
    // Wait for initial observer callbacks
    await new Promise(resolve => setTimeout(resolve, 100));
    observerState.dirtyElements!.clear();
    observerState.observerStats!.totalCallbacks = 0;
    observerState.observerStats!.dirtyElementCount = 0;
    
    for (let i = 0; i < frames; i++) {
      // Animate 2 elements
      anim1.style.transform = `translate(-50%, -50%) rotate(${i * 3.6}deg)`;
      anim2.style.transform = `translate(50%, -50%) rotate(${-i * 3.6}deg)`;
      
      // Wait for observers to fire
      await new Promise(resolve => setTimeout(resolve, 1));
      
      const start = performance.now();
      syncStylesWithObservers(observerState, i * 33);
      observerSyncTime += performance.now() - start;
      
      totalCallbacks += observerState.observerStats!.totalCallbacks;
      totalDirtyElements += observerState.observerStats!.dirtyElementCount;
    }
    
    // Debug: Check final dirty state
    const finalDirtyCount = observerState.dirtyElements!.size;
    
    console.log(`\nResults (${frames} frames):`);
    console.log(`\nCurrent approach (no observers):`);
    console.log(`  Total time: ${normalTime.toFixed(2)}ms`);
    console.log(`  Avg per frame: ${(normalTime / frames).toFixed(3)}ms`);
    console.log(`  Elements synced: ${22 * frames} (all elements every frame)`);
    
    console.log(`\nObserver approach (BROKEN - not actually skipping):`);
    console.log(`  Total time: ${observerSyncTime.toFixed(2)}ms`);
    console.log(`  Avg per frame: ${(observerSyncTime / frames).toFixed(3)}ms`);
    console.log(`  Observer callbacks: ${totalCallbacks}`);
    console.log(`  Dirty elements at end: ${finalDirtyCount}`);
    console.log(`  ⚠️  This implementation doesn't actually skip elements!`);
    console.log(`  ⚠️  It just adds observer overhead with no benefit`);
    
    const overhead = ((observerSyncTime - normalTime) / normalTime) * 100;
    console.log(`\nOverhead: ${overhead.toFixed(1)}% (+${(observerSyncTime - normalTime).toFixed(2)}ms)`);
    
    cleanupObservers(observerState);
    container.remove();
  });
  
  test("Measure sync performance: highly dynamic scene", async () => {
    const container = document.createElement("div");
    const apiHost = getApiHost();
    
    // All elements animated
    render(
      html`
      <ef-configuration api-host="${apiHost}" signing-url="">
        <ef-timegroup mode="contain" style="width: 800px; height: 450px; background: #000;">
          ${Array.from({ length: 20 }, (_, i) => html`
            <div class="animated" data-index="${i}"
              style="position: absolute; top: 50%; left: 50%; width: 50px; height: 50px; background: hsl(${i * 18}, 70%, 50%);">
            </div>
          `)}
        </ef-timegroup>
      </ef-configuration>
    `,
      container,
    );
    document.body.appendChild(container);
    
    const timegroup = container.querySelector("ef-timegroup") as EFTimegroup;
    const animated = Array.from(container.querySelectorAll(".animated")) as HTMLElement[];
    await timegroup.updateComplete;
    
    console.log(`\n=== Highly Dynamic Scene (20 animated) ===`);
    
    const frames = 100;
    
    // Test 1: Current approach
    const { syncState: normalState } = buildCloneStructure(timegroup, 0);
    let normalTime = 0;
    
    for (let i = 0; i < frames; i++) {
      // Animate all elements
      animated.forEach((el, idx) => {
        const angle = i * 3.6 + idx * 18;
        const radius = 100 + idx * 10;
        const x = Math.cos(angle * Math.PI / 180) * radius;
        const y = Math.sin(angle * Math.PI / 180) * radius;
        el.style.transform = `translate(${x}px, ${y}px) rotate(${angle}deg)`;
      });
      
      const start = performance.now();
      syncStyles(normalState, i * 33);
      normalTime += performance.now() - start;
    }
    
    // Test 2: With observers
    const { syncState: observerState } = buildCloneStructureWithObservers(timegroup, 0);
    let observerSyncTime = 0;
    
    await new Promise(resolve => setTimeout(resolve, 100));
    observerState.dirtyElements!.clear();
    
    for (let i = 0; i < frames; i++) {
      // Animate all elements
      animated.forEach((el, idx) => {
        const angle = i * 3.6 + idx * 18;
        const radius = 100 + idx * 10;
        const x = Math.cos(angle * Math.PI / 180) * radius;
        const y = Math.sin(angle * Math.PI / 180) * radius;
        el.style.transform = `translate(${x}px, ${y}px) rotate(${angle}deg)`;
      });
      
      await new Promise(resolve => setTimeout(resolve, 1));
      
      const start = performance.now();
      syncStylesWithObservers(observerState, i * 33);
      observerSyncTime += performance.now() - start;
    }
    
    console.log(`\nResults (${frames} frames):`);
    console.log(`\nCurrent approach: ${normalTime.toFixed(2)}ms (${(normalTime / frames).toFixed(3)}ms/frame)`);
    console.log(`Observer approach: ${observerSyncTime.toFixed(2)}ms (${(observerSyncTime / frames).toFixed(3)}ms/frame)`);
    
    const diff = observerSyncTime - normalTime;
    if (diff > 0) {
      console.log(`\n⚠️  Observer approach is SLOWER by ${diff.toFixed(2)}ms (${(diff / normalTime * 100).toFixed(1)}% overhead)`);
      console.log(`   With all elements changing, observer overhead dominates`);
    } else {
      console.log(`\nSavings: ${Math.abs(diff).toFixed(2)}ms`);
    }
    
    cleanupObservers(observerState);
    container.remove();
  });
  
  test("Measure sync performance: video export scenario", async () => {
    const container = document.createElement("div");
    const apiHost = getApiHost();
    
    // Realistic video export: some video elements, some static overlays, some animated text
    render(
      html`
      <ef-configuration api-host="${apiHost}" signing-url="">
        <ef-timegroup mode="contain" style="width: 1920px; height: 1080px; background: #000;">
          <ef-video src="bars-n-tone.mp4" style="width: 100%; height: 100%;"></ef-video>
          
          <!-- Static overlays -->
          <div style="position: absolute; top: 20px; left: 20px; padding: 10px; background: rgba(0,0,0,0.7); color: white;">
            Brand Logo
          </div>
          <div style="position: absolute; bottom: 20px; right: 20px; padding: 10px; background: rgba(0,0,0,0.7); color: white;">
            @username
          </div>
          
          <!-- Animated title -->
          <div id="title" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 72px; color: white; text-shadow: 2px 2px 4px black;">
            Title Text
          </div>
          
          <!-- Static description -->
          <div style="position: absolute; bottom: 100px; left: 50%; transform: translateX(-50%); color: white; text-align: center;">
            Video description text that stays static
          </div>
        </ef-timegroup>
      </ef-configuration>
    `,
      container,
    );
    document.body.appendChild(container);
    
    const timegroup = container.querySelector("ef-timegroup") as EFTimegroup;
    const title = container.querySelector("#title") as HTMLElement;
    await timegroup.updateComplete;
    await timegroup.waitForMediaDurations?.();
    
    console.log(`\n=== Video Export Scenario (1920x1080, 1 video, 4 overlays) ===`);
    
    // Simulate 300 frames (10 seconds at 30fps)
    const frames = 300;
    
    // Test 1: Current approach
    const { syncState: normalState } = buildCloneStructure(timegroup, 0);
    let normalTime = 0;
    
    for (let i = 0; i < frames; i++) {
      // Only animate title (fade in/out)
      const progress = i / frames;
      const opacity = progress < 0.2 ? progress / 0.2 : progress > 0.8 ? (1 - progress) / 0.2 : 1;
      title.style.opacity = String(opacity);
      
      const start = performance.now();
      syncStyles(normalState, i * 33);
      normalTime += performance.now() - start;
    }
    
    // Test 2: With observers
    const { syncState: observerState } = buildCloneStructureWithObservers(timegroup, 0);
    let observerSyncTime = 0;
    
    await new Promise(resolve => setTimeout(resolve, 100));
    observerState.dirtyElements!.clear();
    
    for (let i = 0; i < frames; i++) {
      const progress = i / frames;
      const opacity = progress < 0.2 ? progress / 0.2 : progress > 0.8 ? (1 - progress) / 0.2 : 1;
      title.style.opacity = String(opacity);
      
      await new Promise(resolve => setTimeout(resolve, 1));
      
      const start = performance.now();
      syncStylesWithObservers(observerState, i * 33);
      observerSyncTime += performance.now() - start;
    }
    
    console.log(`\nResults (${frames} frames = 10 seconds at 30fps):`);
    console.log(`\nCurrent approach:`);
    console.log(`  Total time: ${normalTime.toFixed(2)}ms`);
    console.log(`  Avg per frame: ${(normalTime / frames).toFixed(3)}ms`);
    console.log(`  Export would take: ${(normalTime / 1000).toFixed(2)}s for sync alone`);
    
    console.log(`\nObserver approach:`);
    console.log(`  Total time: ${observerSyncTime.toFixed(2)}ms`);
    console.log(`  Avg per frame: ${(observerSyncTime / frames).toFixed(3)}ms`);
    console.log(`  Export would take: ${(observerSyncTime / 1000).toFixed(2)}s for sync alone`);
    
    const savings = normalTime - observerSyncTime;
    const savingsPercent = (savings / normalTime) * 100;
    console.log(`\nSavings: ${savings.toFixed(2)}ms (${savingsPercent.toFixed(1)}%)`);
    console.log(`Time saved per 10s export: ${(savings / 1000).toFixed(3)}s`);
    
    cleanupObservers(observerState);
    container.remove();
  });
  
  test("Measure with ACTUAL skipping logic", async () => {
    const container = document.createElement("div");
    const apiHost = getApiHost();
    
    // 20 static, 2 animated
    render(
      html`
      <ef-configuration api-host="${apiHost}" signing-url="">
        <ef-timegroup mode="contain" style="width: 800px; height: 450px; background: #000;">
          ${Array.from({ length: 20 }, (_, i) => html`
            <div class="static" style="position: absolute; top: ${i * 20}px; left: 50px; width: 200px; height: 15px; background: rgba(255,255,255,0.3);">
              Static ${i}
            </div>
          `)}
          <div id="anim-1" style="position: absolute; top: 50%; left: 25%; width: 100px; height: 100px; background: red;"></div>
          <div id="anim-2" style="position: absolute; top: 50%; right: 25%; width: 100px; height: 100px; background: blue;"></div>
        </ef-timegroup>
      </ef-configuration>
    `,
      container,
    );
    document.body.appendChild(container);
    
    const timegroup = container.querySelector("ef-timegroup") as EFTimegroup;
    const anim1 = container.querySelector("#anim-1") as HTMLElement;
    const anim2 = container.querySelector("#anim-2") as HTMLElement;
    await timegroup.updateComplete;
    
    console.log(`\n=== ACTUAL Skipping Implementation (20 static, 2 animated) ===`);
    
    const frames = 100;
    
    // Build structure with observers
    const { syncState: observerState } = buildCloneStructureWithObservers(timegroup, 0);
    
    // Wait for initial observer setup
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Clear initial dirty flags
    observerState.dirtyElements!.clear();
    let syncedElements = 0;
    let skippedElements = 0;
    let observerSyncTime = 0;
    
    for (let i = 0; i < frames; i++) {
      // Animate 2 elements
      anim1.style.transform = `translate(-50%, -50%) rotate(${i * 3.6}deg)`;
      anim2.style.transform = `translate(50%, -50%) rotate(${-i * 3.6}deg)`;
      
      // Wait for observers to fire
      await new Promise(resolve => setTimeout(resolve, 1));
      
      const frameStart = performance.now();
      
      // Manually sync with actual skipping
      traverseCloneTree(observerState, (node) => {
        if (node.clone.style.display !== "none") {
          // Check if element is dirty OR this is first frame
          if (i === 0 || observerState.dirtyElements!.has(node.source)) {
            // Actually sync this element
            const cs = getComputedStyle(node.source);
            for (const prop of SYNC_PROPERTIES) {
              (node.clone.style as any)[prop] = (cs as any)[prop];
            }
            syncedElements++;
          } else {
            // SKIP! Element hasn't changed
            skippedElements++;
          }
        }
      });
      
      observerSyncTime += performance.now() - frameStart;
      
      // Clear dirty flags after frame
      observerState.dirtyElements!.clear();
    }
    
    // Now measure current approach for comparison
    const { syncState: normalState } = buildCloneStructure(timegroup, 0);
    let normalTime = 0;
    
    for (let i = 0; i < frames; i++) {
      anim1.style.transform = `translate(-50%, -50%) rotate(${i * 3.6}deg)`;
      anim2.style.transform = `translate(50%, -50%) rotate(${-i * 3.6}deg)`;
      
      const start = performance.now();
      syncStyles(normalState, i * 33);
      normalTime += performance.now() - start;
    }
    
    console.log(`\nResults (${frames} frames):`);
    console.log(`\nCurrent approach:`);
    console.log(`  Time: ${normalTime.toFixed(2)}ms (${(normalTime / frames).toFixed(3)}ms/frame)`);
    console.log(`  Elements synced: ~${22 * frames} (all elements every frame)`);
    
    console.log(`\nWith actual skipping:`);
    console.log(`  Time: ${observerSyncTime.toFixed(2)}ms (${(observerSyncTime / frames).toFixed(3)}ms/frame)`);
    console.log(`  Elements synced: ${syncedElements}`);
    console.log(`  Elements skipped: ${skippedElements}`);
    console.log(`  Skip rate: ${(skippedElements / (syncedElements + skippedElements) * 100).toFixed(1)}%`);
    
    const diff = normalTime - observerSyncTime;
    if (diff > 0) {
      console.log(`\n✓ Savings: ${diff.toFixed(2)}ms (${(diff / normalTime * 100).toFixed(1)}%)`);
    } else {
      console.log(`\n❌ SLOWER by ${Math.abs(diff).toFixed(2)}ms (${(Math.abs(diff) / normalTime * 100).toFixed(1)}%)`);
      console.log(`   Observer + setTimeout overhead exceeds sync savings`);
    }
    
    cleanupObservers(observerState);
    container.remove();
  });
});
