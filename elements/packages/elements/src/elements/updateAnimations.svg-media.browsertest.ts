/**
 * Browser tests for SVG SMIL and media element animation control in updateAnimations.
 *
 * These tests verify that updateAnimations() synchronizes non-CSS animation systems:
 * - SVG SMIL animations (<animate>, <animateTransform>, <animateMotion>)
 * - HTML media elements (<video>, <audio>)
 */

import { LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import { assert, beforeEach, describe, test } from "vitest";

import { EFTemporal } from "./EFTemporal.js";
import { updateAnimations } from "./updateAnimations.js";
import "./EFTimegroup.js";
import type { EFTimegroup } from "./EFTimegroup.js";

@customElement("test-temporal-svg")
class TestTemporalSvg extends EFTemporal(LitElement) {
  get intrinsicDurationMs() {
    return this._durationMs;
  }
  get hasOwnDuration() {
    return true;
  }
  private _durationMs = 2000;
  setDuration(d: number) {
    this._durationMs = d;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "test-temporal-svg": TestTemporalSvg;
  }
}

beforeEach(() => {
  while (document.body.children.length) {
    document.body.children[0]?.remove();
  }
});

// ============================================================================
// SVG SMIL — eager pause on connect
// ============================================================================

describe("EFTimegroup - SVG SMIL autoplay prevention", () => {
  function makeSvgWithAnimation(): SVGSVGElement {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "100");
    svg.setAttribute("height", "100");
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    const animate = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "animate",
    );
    animate.setAttribute("attributeName", "x");
    animate.setAttribute("from", "0");
    animate.setAttribute("to", "100");
    animate.setAttribute("dur", "2s");
    animate.setAttribute("repeatCount", "indefinite");
    rect.appendChild(animate);
    svg.appendChild(rect);
    return svg;
  }

  test("SVG animations are paused immediately when ef-timegroup connects to DOM", () => {
    const svg = makeSvgWithAnimation();

    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "2000ms");
    timegroup.appendChild(svg);

    document.body.appendChild(timegroup);

    assert.isTrue(
      svg.animationsPaused(),
      "SVG SMIL should be paused immediately on connect, before any frame fires",
    );
  });

  test("SVG animations are paused when inserted into a connected ef-timegroup", async () => {
    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "2000ms");
    document.body.appendChild(timegroup);

    // Wait for Lit's first update so the shadow slot and slotchange listener exist
    await timegroup.updateComplete;

    const svg = makeSvgWithAnimation();
    timegroup.appendChild(svg);

    // Wait for slotchange to fire (microtask) and then one more microtask for any
    // handler work, plus one rAF to ensure no paint sneaks through before the pause
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );

    assert.isTrue(
      svg.animationsPaused(),
      "SVG SMIL should be paused before the first paint after insertion",
    );
  });
});

// ============================================================================
// CSS animations — eager pause on animationstart
// ============================================================================

describe("EFTimegroup - CSS animation autoplay prevention", () => {
  // Use element.animate() (WAAPI) to create animations we fully control.
  // CSS class-triggered animations complete too fast in headless Chromium's
  // accelerated timer environment, making getAnimations() return 0 by the
  // time we query. WAAPI gives us a reference to the animation object directly.
  //
  // The mechanism under test: ef-timegroup attaches a capture `animationstart`
  // listener that immediately pauses any running animation on e.target.
  // We simulate the browser firing this event by dispatching it manually.

  test("ef-timegroup pauses a running animation when animationstart fires on a descendant", () => {
    const child = document.createElement("div");
    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "2000ms");
    timegroup.appendChild(child);
    document.body.appendChild(timegroup);

    const anim = child.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 10000,
      fill: "both",
    });
    anim.play();
    assert.equal(
      anim.playState,
      "running",
      "Animation must be running before the event",
    );

    child.dispatchEvent(
      new AnimationEvent("animationstart", { bubbles: true }),
    );

    assert.notEqual(
      anim.playState,
      "running",
      "ef-timegroup capture listener must pause the running animation when animationstart fires",
    );
  });

  test("ef-timegroup pauses a running animation when animationstart fires on itself", () => {
    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "2000ms");
    document.body.appendChild(timegroup);

    const anim = timegroup.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 10000,
      fill: "both",
    });
    anim.play();
    assert.equal(
      anim.playState,
      "running",
      "Animation must be running before the event",
    );

    timegroup.dispatchEvent(
      new AnimationEvent("animationstart", { bubbles: true }),
    );

    assert.notEqual(
      anim.playState,
      "running",
      "ef-timegroup must pause its own animation when animationstart fires on it",
    );
  });

  test("ef-timegroup pauses running animation on late-inserted descendant", async () => {
    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "2000ms");
    document.body.appendChild(timegroup);
    await timegroup.updateComplete;

    const child = document.createElement("div");
    timegroup.appendChild(child);

    const anim = child.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 10000,
      fill: "both",
    });
    anim.play();
    assert.equal(
      anim.playState,
      "running",
      "Animation must be running before the event",
    );

    child.dispatchEvent(
      new AnimationEvent("animationstart", { bubbles: true }),
    );

    assert.notEqual(
      anim.playState,
      "running",
      "ef-timegroup must pause late-inserted descendant animation on animationstart",
    );
  });
});

// ============================================================================
// SVG SMIL
// ============================================================================

describe("updateAnimations - SVG SMIL", () => {
  test("pauses SVG SMIL clock when updateAnimations is called", () => {
    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "2000ms");

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "100");
    svg.setAttribute("height", "100");

    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    const animate = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "animate",
    );
    animate.setAttribute("attributeName", "x");
    animate.setAttribute("from", "0");
    animate.setAttribute("to", "100");
    animate.setAttribute("dur", "2s");
    animate.setAttribute("fill", "freeze");
    rect.appendChild(animate);
    svg.appendChild(rect);
    timegroup.appendChild(svg);
    document.body.appendChild(timegroup);

    timegroup.currentTimeMs = 500;
    updateAnimations(timegroup);

    // After updateAnimations, SVG animations should be paused
    assert.isTrue(
      svg.animationsPaused(),
      "SVG animations should be paused after updateAnimations",
    );
  });

  test("seeks SVG SMIL to the correct time proportional to current position", () => {
    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "2000ms");

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "100");
    svg.setAttribute("height", "100");

    const circle = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle",
    );
    const animate = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "animate",
    );
    animate.setAttribute("attributeName", "cx");
    animate.setAttribute("from", "0");
    animate.setAttribute("to", "200");
    animate.setAttribute("dur", "2s");
    animate.setAttribute("fill", "freeze");
    circle.appendChild(animate);
    svg.appendChild(circle);
    timegroup.appendChild(svg);
    document.body.appendChild(timegroup);

    timegroup.currentTimeMs = 1000;
    updateAnimations(timegroup);

    // SVG currentTime is in seconds; 1000ms → 1s
    const svgTime = svg.getCurrentTime();
    assert.approximately(
      svgTime,
      1.0,
      0.01,
      "SVG current time should be 1.0s for 1000ms timeline position",
    );
  });

  test("seeks SVG SMIL to zero at start of timeline", () => {
    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "2000ms");

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "100");
    svg.setAttribute("height", "100");
    timegroup.appendChild(svg);
    document.body.appendChild(timegroup);

    timegroup.currentTimeMs = 0;
    updateAnimations(timegroup);

    assert.approximately(
      svg.getCurrentTime(),
      0,
      0.01,
      "SVG time should be 0 at timeline start",
    );
  });

  test("seeks SVG SMIL in a nested temporal element", () => {
    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "4000ms");

    const child = document.createElement(
      "test-temporal-svg",
    ) as TestTemporalSvg;
    child.setDuration(4000);
    child.setAttribute("duration", "4000ms");

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "100");
    svg.setAttribute("height", "100");
    child.appendChild(svg);
    timegroup.appendChild(child);
    document.body.appendChild(timegroup);

    timegroup.currentTimeMs = 2000;
    updateAnimations(timegroup);

    // The child's ownCurrentTimeMs at 2000ms should be 2000ms → 2.0s for SVG
    const svgTime = svg.getCurrentTime();
    assert.approximately(
      svgTime,
      2.0,
      0.01,
      "SVG in nested element should be seeked to child's own time",
    );
  });

  test("handles multiple SVG elements in the subtree", () => {
    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "3000ms");

    const svg1 = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg1.setAttribute("width", "100");
    svg1.setAttribute("height", "100");
    const svg2 = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg2.setAttribute("width", "100");
    svg2.setAttribute("height", "100");
    timegroup.appendChild(svg1);
    timegroup.appendChild(svg2);
    document.body.appendChild(timegroup);

    timegroup.currentTimeMs = 1500;
    updateAnimations(timegroup);

    assert.isTrue(svg1.animationsPaused(), "First SVG should be paused");
    assert.isTrue(svg2.animationsPaused(), "Second SVG should be paused");
    assert.approximately(
      svg1.getCurrentTime(),
      1.5,
      0.01,
      "First SVG should be at 1.5s",
    );
    assert.approximately(
      svg2.getCurrentTime(),
      1.5,
      0.01,
      "Second SVG should be at 1.5s",
    );
  });
});

// ============================================================================
// Media elements (<video> / <audio>)
// ============================================================================

describe("updateAnimations - media elements", () => {
  test("pauses <video> elements when updateAnimations is called", () => {
    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "5000ms");

    const video = document.createElement("video");
    // Set a data URI so the video has a src but doesn't actually load
    video.setAttribute("src", "data:video/mp4;base64,");
    timegroup.appendChild(video);
    document.body.appendChild(timegroup);

    timegroup.currentTimeMs = 2000;
    updateAnimations(timegroup);

    assert.isTrue(
      video.paused,
      "video should be paused after updateAnimations",
    );
  });

  test("seeks <video> currentTime to match timeline position in seconds", () => {
    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "5000ms");

    const video = document.createElement("video");
    timegroup.appendChild(video);
    document.body.appendChild(timegroup);

    timegroup.currentTimeMs = 2500;
    updateAnimations(timegroup);

    // 2500ms → 2.5s
    assert.approximately(
      video.currentTime,
      2.5,
      0.01,
      "video currentTime should be 2.5s for 2500ms position",
    );
  });

  test("seeks <audio> currentTime to match timeline position in seconds", () => {
    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "5000ms");

    const audio = document.createElement("audio");
    timegroup.appendChild(audio);
    document.body.appendChild(timegroup);

    timegroup.currentTimeMs = 1000;
    updateAnimations(timegroup);

    assert.approximately(
      audio.currentTime,
      1.0,
      0.01,
      "audio currentTime should be 1.0s for 1000ms position",
    );
  });

  test("seeks multiple media elements in the subtree", () => {
    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "5000ms");

    const video = document.createElement("video");
    const audio = document.createElement("audio");
    timegroup.appendChild(video);
    timegroup.appendChild(audio);
    document.body.appendChild(timegroup);

    timegroup.currentTimeMs = 3000;
    updateAnimations(timegroup);

    assert.approximately(
      video.currentTime,
      3.0,
      0.01,
      "video should be at 3.0s",
    );
    assert.approximately(
      audio.currentTime,
      3.0,
      0.01,
      "audio should be at 3.0s",
    );
  });

  test("uses the containing temporal element own time for media inside a child temporal", () => {
    // Use a sequence timegroup so the second child gets a non-zero startTimeMs.
    // first:  duration 2000ms  → startTimeMs = 0
    // second: duration 4000ms  → startTimeMs = 2000ms
    // Seek root to 3000ms → second child currentTimeMs = 3000 - 2000 = 1000ms → 1.0s
    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    timegroup.setAttribute("mode", "sequence");

    const first = document.createElement(
      "test-temporal-svg",
    ) as TestTemporalSvg;
    first.setDuration(2000);
    first.setAttribute("duration", "2000ms");
    timegroup.appendChild(first);

    const second = document.createElement(
      "test-temporal-svg",
    ) as TestTemporalSvg;
    second.setDuration(4000);
    second.setAttribute("duration", "4000ms");
    const video = document.createElement("video");
    second.appendChild(video);
    timegroup.appendChild(second);

    document.body.appendChild(timegroup);

    timegroup.currentTimeMs = 3000;
    updateAnimations(timegroup);

    // second.currentTimeMs = 3000 - 2000 = 1000ms → 1.0s
    assert.approximately(
      video.currentTime,
      1.0,
      0.01,
      "video inside child element should use child's own time (1000ms)",
    );
  });
});
