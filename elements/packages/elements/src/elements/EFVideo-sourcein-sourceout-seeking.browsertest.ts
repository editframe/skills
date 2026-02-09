/**
 * Test suite to clarify and document the expected behavior when sourcein/sourceout
 * attributes change on an EFVideo element.
 * 
 * This addresses a confusing API behavior discovered while building a trim tool:
 * - When dragging individual in/out handles, the video APPEARS to seek
 * - When dragging both handles together (region drag), it doesn't appear to seek
 * - Investigation revealed the timegroup always stays at currentTimeMs: 0
 * 
 * This test suite documents what SHOULD happen to help guide API improvements.
 */

import { html, render } from "lit";
import { beforeAll, beforeEach, describe, expect } from "vitest";
import { test as baseTest } from "../../test/useMSW.js";
import type { EFVideo } from "./EFVideo.js";
import type { EFTimegroup } from "./EFTimegroup.js";
import "./EFVideo.js";
import "./EFTimegroup.js";

beforeAll(async () => {
  console.clear();
  await fetch("/@ef-clear-cache", { method: "DELETE" });
});

beforeEach(() => {
  localStorage.clear();
});

const test = baseTest.extend<{
  container: HTMLDivElement;
  timegroup: EFTimegroup;
  video: EFVideo;
}>({
  container: async ({}, use) => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    await use(container);
    container.remove();
  },
  
  timegroup: async ({ container }, use) => {
    const tg = document.createElement("ef-timegroup") as EFTimegroup;
    tg.setAttribute("mode", "fixed");
    tg.setAttribute("duration", "6000ms");
    container.appendChild(tg);
    await tg.updateComplete;
    await use(tg);
  },
  
  video: async ({ timegroup }, use) => {
    const video = document.createElement("ef-video") as EFVideo;
    video.setAttribute("src", "https://assets.editframe.com/bars-n-tone.mp4");
    video.setAttribute("sourcein", "2000ms");
    video.setAttribute("sourceout", "8000ms");
    timegroup.appendChild(video);
    await video.updateComplete;
    await use(video);
  },
});

describe("EFVideo sourcein/sourceout seeking behavior", () => {
  test("documents current behavior: timegroup stays at time 0 when sourcein changes", async ({ 
    timegroup, 
    video 
  }) => {
    // Initial state
    expect(timegroup.currentTimeMs).toBe(0);
    expect(video.getAttribute("sourcein")).toBe("2000ms");
    expect(video.getAttribute("sourceout")).toBe("8000ms");
    
    // Change sourcein (simulating dragging the in-handle)
    video.setAttribute("sourcein", "3000ms");
    await video.updateComplete;
    await timegroup.updateComplete;
    
    // CURRENT BEHAVIOR: timegroup stays at 0
    // This means we're now showing frame at 3000ms from source video
    expect(timegroup.currentTimeMs).toBe(0);
  });

  test("documents current behavior: timegroup stays at time 0 when sourceout changes", async ({ 
    timegroup, 
    video 
  }) => {
    // Initial state
    expect(timegroup.currentTimeMs).toBe(0);
    
    // Change sourceout (simulating dragging the out-handle)
    video.setAttribute("sourceout", "7000ms");
    await video.updateComplete;
    await timegroup.updateComplete;
    
    // CURRENT BEHAVIOR: timegroup stays at 0
    expect(timegroup.currentTimeMs).toBe(0);
  });

  test("documents current behavior: timegroup stays at time 0 when both sourcein and sourceout change", async ({ 
    timegroup, 
    video 
  }) => {
    // Initial state
    expect(timegroup.currentTimeMs).toBe(0);
    
    // Change both (simulating dragging the entire trim region)
    video.setAttribute("sourcein", "3000ms");
    video.setAttribute("sourceout", "9000ms");
    await video.updateComplete;
    await timegroup.updateComplete;
    
    // CURRENT BEHAVIOR: timegroup stays at 0
    // This is confusing because the user expects to see the new in-point
    expect(timegroup.currentTimeMs).toBe(0);
  });

  test("documents expected behavior: should timegroup reset to 0 when sourcein changes?", async ({ 
    timegroup, 
    video 
  }) => {
    // Seek to middle of clip
    timegroup.currentTimeMs = 3000;
    await timegroup.updateComplete;
    expect(timegroup.currentTimeMs).toBe(3000);
    
    // Change sourcein
    video.setAttribute("sourcein", "3000ms");
    await video.updateComplete;
    await timegroup.updateComplete;
    
    // QUESTION: Should this reset to 0, or maintain position?
    // Option A: Reset to 0 (show new in-point)
    // Option B: Maintain 3000ms (stay at same relative position if possible)
    // Option C: Maintain absolute source time (complex, probably not desired)
    
    // For now, document current behavior
    const currentTime = timegroup.currentTimeMs;
    console.log("Current behavior: timegroup.currentTimeMs =", currentTime);
    
    // This test is intentionally not asserting - it's documenting the question
  });

  test.skip("proposed behavior: sourcein/sourceout changes should emit an event", async ({ 
    timegroup, 
    video 
  }) => {
    // PROPOSAL: Video should emit an event when sourcein/sourceout changes
    // This would allow UI components (like a trim tool) to decide whether to seek
    
    let eventFired = false;
    video.addEventListener("source-range-changed", ((e: CustomEvent) => {
      eventFired = true;
      expect(e.detail).toMatchObject({
        oldSourceIn: 2000,
        newSourceIn: 3000,
        oldSourceOut: 8000,
        newSourceOut: 8000,
      });
    }) as EventListener);
    
    video.setAttribute("sourcein", "3000ms");
    await video.updateComplete;
    
    expect(eventFired).toBe(true);
  });

  test.skip("proposed behavior: Video could have a seekBehavior attribute", async ({ 
    timegroup, 
    video 
  }) => {
    // PROPOSAL: Add a seekBehavior attribute to control what happens
    // when sourcein/sourceout changes
    
    // seekBehavior="reset" - always reset to time 0 when range changes
    video.setAttribute("seek-behavior", "reset");
    video.setAttribute("sourcein", "3000ms");
    await video.updateComplete;
    await timegroup.updateComplete;
    expect(timegroup.currentTimeMs).toBe(0);
    
    // seekBehavior="maintain" - try to maintain current position
    video.setAttribute("seek-behavior", "maintain");
    timegroup.currentTimeMs = 2000;
    video.setAttribute("sourcein", "4000ms");
    await video.updateComplete;
    await timegroup.updateComplete;
    expect(timegroup.currentTimeMs).toBe(2000);
    
    // seekBehavior="none" (default) - don't automatically seek
    video.setAttribute("seek-behavior", "none");
    // ... behavior is up to the application
  });
});

describe("Principle of Least Surprise", () => {
  test("user expectation: dragging in-handle should show the new in-point", async ({ 
    timegroup, 
    video 
  }) => {
    // When a user drags the in-handle in a trim tool, they expect to see
    // the frame at the new in-point. Currently this happens "accidentally"
    // because timegroup is at 0, but it's not explicit in the API.
    
    // This is the CURRENT behavior that works by accident:
    expect(timegroup.currentTimeMs).toBe(0);
    video.setAttribute("sourcein", "3000ms");
    await video.updateComplete;
    // User sees frame at 3000ms from source (which is time 0 in timegroup)
    expect(timegroup.currentTimeMs).toBe(0);
  });

  test("user expectation: dragging region should maintain visual continuity", async ({ 
    timegroup, 
    video 
  }) => {
    // When a user drags the entire trim region, they expect one of:
    // A) Video jumps to show the new in-point (reset to time 0)
    // B) Video maintains the same relative position within the clip
    
    // Currently, neither happens explicitly - it's up to the app to seek
    
    // Most trim tools reset to the in-point for clarity:
    timegroup.currentTimeMs = 3000; // User was in the middle
    video.setAttribute("sourcein", "3000ms");
    video.setAttribute("sourceout", "9000ms");
    await video.updateComplete;
    await timegroup.updateComplete;
    
    // Application should explicitly seek to 0 to show new in-point
    timegroup.currentTimeMs = 0;
    expect(timegroup.currentTimeMs).toBe(0);
  });
});
