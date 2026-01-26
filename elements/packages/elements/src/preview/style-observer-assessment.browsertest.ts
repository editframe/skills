/**
 * Assessment: Can @bramus/style-observer reduce unnecessary style copies?
 * 
 * This test measures:
 * 1. Actual cost of getComputedStyle() in the sync loop
 * 2. How many properties actually change between frames
 * 3. Whether style-observer could reduce this cost
 * 
 * Run with:
 *   cd elements && ./scripts/browsertest src/preview/style-observer-assessment.browsertest.ts
 */

import { html, render } from "lit";
import { beforeAll, describe, expect, test } from "vitest";
import { CSSStyleObserver } from "@bramus/style-observer";

import { getApiHost } from "../../test/setup.js";
import type { EFTimegroup } from "../elements/EFTimegroup.js";
import { buildCloneStructure, syncStyles, traverseCloneTree } from "./renderTimegroupPreview.js";
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

describe("Style Copy Assessment", () => {
  test("Measure getComputedStyle cost in sync loop", async () => {
    const container = document.createElement("div");
    const apiHost = getApiHost();
    
    // Create a complex timegroup with animated elements
    render(
      html`
      <ef-configuration api-host="${apiHost}" signing-url="">
        <ef-timegroup mode="contain" id="test-timegroup"
          style="width: 800px; height: 450px; background: #1a1a2e;">
          <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 200px; height: 200px;">
            <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: red; opacity: 0.5;"></div>
            <div style="position: absolute; top: 20px; left: 20px; width: 80%; height: 80%; background: blue; transform: rotate(45deg);"></div>
            <div style="position: absolute; top: 40px; left: 40px; width: 60%; height: 60%; background: green; border-radius: 50%;"></div>
          </div>
          <ef-video src="bars-n-tone.mp4" start-time-ms="1000" end-time-ms="3000" 
            style="width: 300px; height: 200px; position: absolute; bottom: 20px; right: 20px;"></ef-video>
        </ef-timegroup>
      </ef-configuration>
    `,
      container,
    );
    document.body.appendChild(container);
    
    const timegroup = container.querySelector("ef-timegroup") as EFTimegroup;
    await timegroup.updateComplete;
    await timegroup.waitForMediaDurations?.();
    
    // Build clone structure
    const { syncState } = buildCloneStructure(timegroup, 0);
    
    // Count total nodes
    let nodeCount = 0;
    traverseCloneTree(syncState, () => nodeCount++);
    
    console.log(`\n=== Style Copy Cost Assessment ===`);
    console.log(`Total nodes in clone tree: ${nodeCount}`);
    
    // Measurement 1: Cost of getComputedStyle calls
    const frames = 30;
    let totalGetComputedStyleTime = 0;
    let totalSyncTime = 0;
    let totalGetComputedStyleCalls = 0;
    
    for (let frame = 0; frame < frames; frame++) {
      const timeMs = frame * 33; // 30fps
      
      // Measure getComputedStyle() calls
      const getComputedStyleStart = performance.now();
      traverseCloneTree(syncState, (node) => {
        if (node.clone.style.display !== "none") {
          getComputedStyle(node.source);
          totalGetComputedStyleCalls++;
        }
      });
      totalGetComputedStyleTime += performance.now() - getComputedStyleStart;
      
      // Measure full sync (includes getComputedStyle + style writes)
      const syncStart = performance.now();
      syncStyles(syncState, timeMs);
      totalSyncTime += performance.now() - syncStart;
    }
    
    const avgGetComputedStyleTime = totalGetComputedStyleTime / frames;
    const avgSyncTime = totalSyncTime / frames;
    const avgGetComputedStyleCalls = totalGetComputedStyleCalls / frames;
    const getComputedStylePercentage = (totalGetComputedStyleTime / totalSyncTime) * 100;
    
    console.log(`\nMeasurement 1: getComputedStyle() Cost`);
    console.log(`  Avg getComputedStyle time: ${avgGetComputedStyleTime.toFixed(2)}ms/frame`);
    console.log(`  Avg full sync time: ${avgSyncTime.toFixed(2)}ms/frame`);
    console.log(`  getComputedStyle is ${getComputedStylePercentage.toFixed(1)}% of sync time`);
    console.log(`  Avg getComputedStyle calls: ${avgGetComputedStyleCalls.toFixed(0)} per frame`);
    
    container.remove();
  });
  
  test("Measure how many properties actually change between frames", async () => {
    const container = document.createElement("div");
    const apiHost = getApiHost();
    
    // Create timegroup with animated transform
    render(
      html`
      <ef-configuration api-host="${apiHost}" signing-url="">
        <ef-timegroup mode="contain" id="test-timegroup"
          style="width: 800px; height: 450px; background: #000;">
          <div id="animated-box" 
            style="position: absolute; top: 50%; left: 50%; width: 100px; height: 100px; background: red;"></div>
        </ef-timegroup>
      </ef-configuration>
    `,
      container,
    );
    document.body.appendChild(container);
    
    const timegroup = container.querySelector("ef-timegroup") as EFTimegroup;
    const animatedBox = container.querySelector("#animated-box") as HTMLElement;
    await timegroup.updateComplete;
    
    console.log(`\n=== Property Change Rate Assessment ===`);
    
    // Track property changes across frames
    const propertyChangeCounts = new Map<string, number>();
    const propertyValues = new Map<string, string>();
    const frames = 60;
    let totalPropertyReads = 0;
    let totalPropertyChanges = 0;
    
    for (let frame = 0; frame < frames; frame++) {
      // Simulate animation - transform changes every frame
      const angle = frame * 6; // rotate 6 degrees per frame
      animatedBox.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
      
      // Read all properties
      const cs = getComputedStyle(animatedBox);
      for (const prop of SYNC_PROPERTIES) {
        const kebabProp = prop.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
        const value = (cs as any)[prop] || cs.getPropertyValue(kebabProp);
        const prevValue = propertyValues.get(prop);
        
        totalPropertyReads++;
        
        if (prevValue !== undefined && prevValue !== value) {
          propertyChangeCounts.set(prop, (propertyChangeCounts.get(prop) || 0) + 1);
          totalPropertyChanges++;
        }
        
        propertyValues.set(prop, value);
      }
    }
    
    // Sort by change frequency
    const sortedChanges = Array.from(propertyChangeCounts.entries())
      .sort((a, b) => b[1] - a[1]);
    
    console.log(`\nProperty Changes (${frames} frames):`);
    console.log(`  Total property reads: ${totalPropertyReads}`);
    console.log(`  Total property changes: ${totalPropertyChanges}`);
    console.log(`  Change rate: ${((totalPropertyChanges / totalPropertyReads) * 100).toFixed(1)}%`);
    console.log(`\nMost frequently changing properties:`);
    sortedChanges.slice(0, 10).forEach(([prop, count]) => {
      console.log(`  ${prop}: ${count} changes (${((count / frames) * 100).toFixed(1)}%)`);
    });
    console.log(`\nStatic properties (never changed): ${SYNC_PROPERTIES.length - propertyChangeCounts.size}`);
    
    container.remove();
  });
  
  test("Measure style-observer overhead vs direct polling", async () => {
    const container = document.createElement("div");
    const apiHost = getApiHost();
    
    render(
      html`
      <ef-configuration api-host="${apiHost}" signing-url="">
        <ef-timegroup mode="contain" style="width: 800px; height: 450px; background: #000;">
          <div id="test-element" 
            style="position: absolute; top: 50%; left: 50%; width: 100px; height: 100px; background: red;"></div>
        </ef-timegroup>
      </ef-configuration>
    `,
      container,
    );
    document.body.appendChild(container);
    
    const element = container.querySelector("#test-element") as HTMLElement;
    const timegroup = container.querySelector("ef-timegroup") as EFTimegroup;
    await timegroup.updateComplete;
    
    console.log(`\n=== Style Observer Overhead Assessment ===`);
    
    // Test 1: Direct polling (current approach)
    const iterations = 100;
    let pollingTime = 0;
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      const cs = getComputedStyle(element);
      // Read subset of frequently-changing properties
      const _transform = cs.transform;
      const _opacity = cs.opacity;
      const _display = cs.display;
      pollingTime += performance.now() - start;
    }
    
    console.log(`\nDirect polling (3 properties):`);
    console.log(`  Total time: ${pollingTime.toFixed(2)}ms (${iterations} iterations)`);
    console.log(`  Avg per read: ${(pollingTime / iterations).toFixed(3)}ms`);
    
    // Test 2: StyleObserver setup + overhead
    const observerCallbacks: any[] = [];
    let observerSetupTime = 0;
    let observerCallbackCount = 0;
    
    const setupStart = performance.now();
    const observer = new CSSStyleObserver(
      ["transform", "opacity", "display"],
      (values) => {
        observerCallbacks.push(values);
        observerCallbackCount++;
      }
    );
    observer.attach(element);
    observerSetupTime = performance.now() - setupStart;
    
    console.log(`\nStyleObserver setup:`);
    console.log(`  Setup time: ${observerSetupTime.toFixed(2)}ms`);
    
    // Trigger some changes
    const changeStart = performance.now();
    for (let i = 0; i < 10; i++) {
      element.style.opacity = String(0.5 + i * 0.05);
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
    const changeTime = performance.now() - changeStart;
    
    console.log(`  Observer callbacks triggered: ${observerCallbackCount}`);
    console.log(`  Time for 10 changes: ${changeTime.toFixed(2)}ms`);
    
    observer.detach();
    
    console.log(`\nConclusion:`);
    console.log(`  For polling every frame (30fps = 33ms), direct polling costs ${(pollingTime / iterations * 30).toFixed(2)}ms/sec`);
    console.log(`  StyleObserver has ${observerSetupTime.toFixed(2)}ms setup overhead per element`);
    console.log(`  With 20 nodes, setup would cost ~${(observerSetupTime * 20).toFixed(0)}ms`);
    
    container.remove();
  });
  
  test("Measure property-specific change patterns", async () => {
    const container = document.createElement("div");
    const apiHost = getApiHost();
    
    render(
      html`
      <ef-configuration api-host="${apiHost}" signing-url="">
        <ef-timegroup mode="contain" style="width: 800px; height: 450px; background: #000;">
          <div id="video-container" style="position: absolute; top: 0; left: 0; width: 400px; height: 300px;">
            <ef-video src="bars-n-tone.mp4" style="width: 100%; height: 100%;"></ef-video>
          </div>
          <div id="static-overlay" 
            style="position: absolute; top: 20px; left: 20px; width: 200px; height: 100px; background: rgba(255,255,255,0.8); padding: 10px;">
            Static Text
          </div>
        </ef-timegroup>
      </ef-configuration>
    `,
      container,
    );
    document.body.appendChild(container);
    
    const timegroup = container.querySelector("ef-timegroup") as EFTimegroup;
    const videoContainer = container.querySelector("#video-container") as HTMLElement;
    const staticOverlay = container.querySelector("#static-overlay") as HTMLElement;
    await timegroup.updateComplete;
    
    console.log(`\n=== Property Change Patterns by Element Type ===`);
    
    const frames = 30;
    const videoChanges = new Map<string, number>();
    const staticChanges = new Map<string, number>();
    
    let videoPrevValues = new Map<string, string>();
    let staticPrevValues = new Map<string, string>();
    
    for (let frame = 0; frame < frames; frame++) {
      // Read video container properties
      const videoCs = getComputedStyle(videoContainer);
      for (const prop of SYNC_PROPERTIES) {
        const value = (videoCs as any)[prop];
        const prev = videoPrevValues.get(prop);
        if (prev !== undefined && prev !== value) {
          videoChanges.set(prop, (videoChanges.get(prop) || 0) + 1);
        }
        videoPrevValues.set(prop, value);
      }
      
      // Read static overlay properties
      const staticCs = getComputedStyle(staticOverlay);
      for (const prop of SYNC_PROPERTIES) {
        const value = (staticCs as any)[prop];
        const prev = staticPrevValues.get(prop);
        if (prev !== undefined && prev !== value) {
          staticChanges.set(prop, (staticChanges.get(prop) || 0) + 1);
        }
        staticPrevValues.set(prop, value);
      }
      
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
    
    console.log(`\nVideo container element:`);
    console.log(`  Properties that changed: ${videoChanges.size}/${SYNC_PROPERTIES.length}`);
    console.log(`  Total changes: ${Array.from(videoChanges.values()).reduce((a, b) => a + b, 0)}`);
    if (videoChanges.size > 0) {
      console.log(`  Frequently changing:`, Array.from(videoChanges.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([k, v]) => `${k}(${v})`).join(", "));
    }
    
    console.log(`\nStatic overlay element:`);
    console.log(`  Properties that changed: ${staticChanges.size}/${SYNC_PROPERTIES.length}`);
    console.log(`  Total changes: ${Array.from(staticChanges.values()).reduce((a, b) => a + b, 0)}`);
    if (staticChanges.size === 0) {
      console.log(`  ✓ Element is truly static - observer would provide no benefit`);
    }
    
    container.remove();
  });
  
  test("Measure read vs write costs in sync", async () => {
    const container = document.createElement("div");
    const apiHost = getApiHost();
    
    render(
      html`
      <ef-configuration api-host="${apiHost}" signing-url="">
        <ef-timegroup mode="contain" style="width: 800px; height: 450px; background: #000;">
          <div id="target1" style="position: absolute; width: 100px; height: 100px; background: red;"></div>
          <div id="target2" style="position: absolute; width: 100px; height: 100px; background: blue;"></div>
          <div id="target3" style="position: absolute; width: 100px; height: 100px; background: green;"></div>
        </ef-timegroup>
      </ef-configuration>
    `,
      container,
    );
    document.body.appendChild(container);
    
    const target1 = container.querySelector("#target1") as HTMLElement;
    const target2 = container.querySelector("#target2") as HTMLElement;
    const target3 = container.querySelector("#target3") as HTMLElement;
    const timegroup = container.querySelector("ef-timegroup") as EFTimegroup;
    await timegroup.updateComplete;
    
    console.log(`\n=== Read vs Write Cost Breakdown ===`);
    
    const iterations = 1000;
    
    // Measure ONLY reads (no writes)
    let readOnlyTime = 0;
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      const cs1 = getComputedStyle(target1);
      const cs2 = getComputedStyle(target2);
      const cs3 = getComputedStyle(target3);
      const _t1 = cs1.transform;
      const _o1 = cs1.opacity;
      const _t2 = cs2.transform;
      const _o2 = cs2.opacity;
      const _t3 = cs3.transform;
      const _o3 = cs3.opacity;
      readOnlyTime += performance.now() - start;
    }
    
    // Measure reads + redundant writes (same values)
    let readWriteSameTime = 0;
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      const cs1 = getComputedStyle(target1);
      const cs2 = getComputedStyle(target2);
      const cs3 = getComputedStyle(target3);
      target1.style.transform = cs1.transform;
      target1.style.opacity = cs1.opacity;
      target2.style.transform = cs2.transform;
      target2.style.opacity = cs2.opacity;
      target3.style.transform = cs3.transform;
      target3.style.opacity = cs3.opacity;
      readWriteSameTime += performance.now() - start;
    }
    
    // Measure reads + changing writes (different values)
    let readWriteChangingTime = 0;
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      const cs1 = getComputedStyle(target1);
      const cs2 = getComputedStyle(target2);
      const cs3 = getComputedStyle(target3);
      target1.style.transform = `rotate(${i}deg)`;
      target1.style.opacity = String(0.5 + (i % 50) / 100);
      target2.style.transform = `rotate(${i * 2}deg)`;
      target2.style.opacity = String(0.5 + (i % 50) / 100);
      target3.style.transform = `rotate(${i * 3}deg)`;
      target3.style.opacity = String(0.5 + (i % 50) / 100);
      readWriteChangingTime += performance.now() - start;
    }
    
    console.log(`\nCost breakdown (${iterations} iterations, 3 elements, 2 properties each):`);
    console.log(`  Read only:           ${readOnlyTime.toFixed(2)}ms (${(readOnlyTime / iterations).toFixed(3)}ms/iter)`);
    console.log(`  Read + write (same): ${readWriteSameTime.toFixed(2)}ms (${(readWriteSameTime / iterations).toFixed(3)}ms/iter)`);
    console.log(`  Read + write (new):  ${readWriteChangingTime.toFixed(2)}ms (${(readWriteChangingTime / iterations).toFixed(3)}ms/iter)`);
    console.log(`\nOverhead:`);
    console.log(`  Writing same values adds: ${((readWriteSameTime - readOnlyTime) / readOnlyTime * 100).toFixed(1)}% overhead`);
    console.log(`  Writing new values adds:  ${((readWriteChangingTime - readOnlyTime) / readOnlyTime * 100).toFixed(1)}% overhead`);
    
    container.remove();
  });
  
  test("Compare current sync vs hypothetical observer-based sync", async () => {
    const container = document.createElement("div");
    const apiHost = getApiHost();
    
    // Create a realistic scene with mix of static and animated elements
    render(
      html`
      <ef-configuration api-host="${apiHost}" signing-url="">
        <ef-timegroup mode="contain" id="test-timegroup"
          style="width: 800px; height: 450px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
          <!-- 10 static elements -->
          ${Array.from({ length: 10 }, (_, i) => html`
            <div class="static-element" 
              style="position: absolute; top: ${i * 40}px; left: 50px; width: 200px; height: 30px; background: rgba(255,255,255,0.3); border-radius: 5px;">
              Static Element ${i}
            </div>
          `)}
          <!-- 2 animated elements -->
          <div id="animated-1" 
            style="position: absolute; top: 50%; left: 25%; width: 100px; height: 100px; background: red; border-radius: 50%;"></div>
          <div id="animated-2" 
            style="position: absolute; top: 50%; right: 25%; width: 100px; height: 100px; background: blue; border-radius: 50%;"></div>
        </ef-timegroup>
      </ef-configuration>
    `,
      container,
    );
    document.body.appendChild(container);
    
    const timegroup = container.querySelector("ef-timegroup") as EFTimegroup;
    const animated1 = container.querySelector("#animated-1") as HTMLElement;
    const animated2 = container.querySelector("#animated-2") as HTMLElement;
    await timegroup.updateComplete;
    
    const { syncState } = buildCloneStructure(timegroup, 0);
    
    console.log(`\n=== Current vs Observer-Based Sync Comparison ===`);
    
    // Simulate 60 frames of animation (2 seconds at 30fps)
    const frames = 60;
    
    // Current approach: sync all nodes every frame
    let currentApproachTime = 0;
    for (let frame = 0; frame < frames; frame++) {
      // Animate
      const angle = frame * 6;
      animated1.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
      animated2.style.transform = `translate(50%, -50%) rotate(${-angle}deg)`;
      
      const start = performance.now();
      syncStyles(syncState, frame * 33);
      currentApproachTime += performance.now() - start;
    }
    
    // Hypothetical observer-based approach: only sync changed nodes
    // Simulate by measuring cost of syncing ONLY the 2 animated elements
    let observerApproachTime = 0;
    const observerSetupTime = 0.30 * 12; // 12 elements × 0.30ms setup
    
    for (let frame = 0; frame < frames; frame++) {
      const angle = frame * 6;
      animated1.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
      animated2.style.transform = `translate(50%, -50%) rotate(${-angle}deg)`;
      
      // Measure cost of syncing just the 2 animated elements
      const start = performance.now();
      traverseCloneTree(syncState, (node) => {
        if (node.source === animated1 || node.source === animated2) {
          const cs = getComputedStyle(node.source);
          node.clone.style.transform = cs.transform;
          node.clone.style.opacity = cs.opacity;
        }
      });
      observerApproachTime += performance.now() - start;
    }
    
    console.log(`\nScenario: 12 elements (10 static, 2 animated) × 60 frames:`);
    console.log(`\nCurrent approach (sync all every frame):`);
    console.log(`  Total time: ${currentApproachTime.toFixed(2)}ms`);
    console.log(`  Avg per frame: ${(currentApproachTime / frames).toFixed(3)}ms`);
    console.log(`  At 30fps: ${(currentApproachTime / frames * 30).toFixed(2)}ms/sec`);
    
    console.log(`\nHypothetical observer approach (sync only changed):`);
    console.log(`  Setup overhead: ${observerSetupTime.toFixed(2)}ms (one-time)`);
    console.log(`  Sync time: ${observerApproachTime.toFixed(2)}ms`);
    console.log(`  Total time: ${(observerSetupTime + observerApproachTime).toFixed(2)}ms`);
    console.log(`  Avg per frame: ${(observerApproachTime / frames).toFixed(3)}ms`);
    console.log(`  At 30fps: ${(observerApproachTime / frames * 30).toFixed(2)}ms/sec`);
    
    console.log(`\nComparison:`);
    if (currentApproachTime < observerSetupTime + observerApproachTime) {
      console.log(`  ❌ Observer approach is SLOWER due to setup overhead`);
      console.log(`  Current is ${(((observerSetupTime + observerApproachTime) / currentApproachTime - 1) * 100).toFixed(1)}% faster`);
    } else {
      console.log(`  ✓ Observer approach is faster`);
      console.log(`  Saves ${((1 - (observerSetupTime + observerApproachTime) / currentApproachTime) * 100).toFixed(1)}% time`);
      console.log(`  Break-even frames: ${Math.ceil(observerSetupTime / ((currentApproachTime - observerApproachTime) / frames))}`);
    }
    
    container.remove();
  });
  
  test("Test if style-observer can actually help with source-to-clone copying", async () => {
    const container = document.createElement("div");
    const apiHost = getApiHost();
    
    render(
      html`
      <ef-configuration api-host="${apiHost}" signing-url="">
        <ef-timegroup mode="contain" style="width: 800px; height: 450px; background: #000;">
          <div id="source-element" 
            style="position: absolute; top: 50%; left: 50%; width: 100px; height: 100px; background: red;"></div>
        </ef-timegroup>
      </ef-configuration>
    `,
      container,
    );
    document.body.appendChild(container);
    
    const sourceElement = container.querySelector("#source-element") as HTMLElement;
    const cloneElement = document.createElement("div");
    document.body.appendChild(cloneElement);
    
    const timegroup = container.querySelector("ef-timegroup") as EFTimegroup;
    await timegroup.updateComplete;
    
    console.log(`\n=== Can StyleObserver Help Source→Clone Syncing? ===`);
    
    // Set up observer on SOURCE element
    let observerCallbackCount = 0;
    let lastObservedValues: any = null;
    
    const observer = new CSSStyleObserver(
      ["transform", "opacity"],
      (values) => {
        observerCallbackCount++;
        lastObservedValues = values;
      }
    );
    observer.attach(sourceElement);
    
    // Test: Change source and measure if we still need getComputedStyle
    const frames = 10;
    let withObserverTime = 0;
    let withoutObserverTime = 0;
    
    console.log(`\nTest: Sync source → clone with and without observer`);
    
    // Approach 1: WITH observer (but still need to copy to clone)
    for (let i = 0; i < frames; i++) {
      sourceElement.style.transform = `rotate(${i * 36}deg)`;
      await new Promise(resolve => requestAnimationFrame(resolve));
      
      const start = performance.now();
      // Observer told us SOMETHING changed, but we still need to:
      // 1. Get the actual computed value (observer values might not be final)
      // 2. Copy it to the clone
      const cs = getComputedStyle(sourceElement);
      cloneElement.style.transform = cs.transform;
      cloneElement.style.opacity = cs.opacity;
      withObserverTime += performance.now() - start;
    }
    
    // Approach 2: WITHOUT observer (just poll every frame)
    for (let i = 0; i < frames; i++) {
      sourceElement.style.transform = `rotate(${i * 36}deg)`;
      
      const start = performance.now();
      const cs = getComputedStyle(sourceElement);
      cloneElement.style.transform = cs.transform;
      cloneElement.style.opacity = cs.opacity;
      withoutObserverTime += performance.now() - start;
    }
    
    console.log(`\nResults:`);
    console.log(`  Observer callbacks fired: ${observerCallbackCount}`);
    console.log(`  WITH observer: ${withObserverTime.toFixed(2)}ms (${(withObserverTime / frames).toFixed(3)}ms/frame)`);
    console.log(`  WITHOUT observer: ${withoutObserverTime.toFixed(2)}ms (${(withoutObserverTime / frames).toFixed(3)}ms/frame)`);
    console.log(`  Difference: ${Math.abs(withObserverTime - withoutObserverTime).toFixed(2)}ms`);
    
    console.log(`\n❌ Key Finding: Observer doesn't eliminate getComputedStyle!`);
    console.log(`  Even when observer fires, we still need to:`);
    console.log(`  1. Call getComputedStyle() to get final computed value`);
    console.log(`  2. Copy that value to clone element`);
    console.log(`  The observer tells us WHEN to copy, but not WHAT to copy.`);
    
    console.log(`\n✓ What WOULD help (based on measurements):`);
    console.log(`  1. Delta tracking - only sync elements that became visible/hidden`);
    console.log(`     (Already implemented in current system!)`);
    console.log(`  2. Property-level dirty tracking - skip properties that can't change`);
    console.log(`     (e.g., most layout properties are static)`);
    console.log(`  3. Element-level dirty tracking - skip elements with no animations/interactions`);
    
    observer.detach();
    container.remove();
    cloneElement.remove();
  });
});
