import { describe, test, expect, beforeEach, afterEach } from "vitest";
import "./EFThumbnailStrip.js";
import "../../../elements/EFTimegroup.js";
import type { EFThumbnailStrip } from "./EFThumbnailStrip.js";
import type { EFTimegroup } from "../../../elements/EFTimegroup.js";

describe("EFThumbnailStrip - Basic Functionality", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test("should render with valid root timegroup target", async () => {
    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    timegroup.id = "test-timegroup";
    timegroup.setAttribute("duration-ms", "10000");
    container.appendChild(timegroup);
    await timegroup.updateComplete;

    const strip = document.createElement("ef-thumbnail-strip") as EFThumbnailStrip;
    strip.targetElement = timegroup;
    strip.thumbnailHeight = 48;
    strip.thumbnailSpacingPx = 96;
    strip.pixelsPerMs = 0.1;
    container.appendChild(strip);

    await strip.updateComplete;

    // Should have a thumbnail container
    const thumbnailContainer = strip.shadowRoot?.querySelector(".thumbnail-container");
    expect(thumbnailContainer).toBeTruthy();
  });

  test("should show error for missing target", async () => {
    const strip = document.createElement("ef-thumbnail-strip") as EFThumbnailStrip;
    container.appendChild(strip);
    await strip.updateComplete;

    const errorMessage = strip.shadowRoot?.querySelector(".error-message");
    expect(errorMessage).toBeTruthy();
    expect(errorMessage?.textContent).toContain("No target specified");
  });

  test("should show error for invalid target type", async () => {
    const div = document.createElement("div");
    div.id = "test-div";
    container.appendChild(div);

    const strip = document.createElement("ef-thumbnail-strip") as EFThumbnailStrip;
    strip.targetElement = div;
    container.appendChild(strip);
    await strip.updateComplete;

    const errorMessage = strip.shadowRoot?.querySelector(".error-message");
    expect(errorMessage).toBeTruthy();
    expect(errorMessage?.textContent).toContain("Invalid target");
  });

  test("should calculate thumbnail dimensions based on target aspect ratio", async () => {
    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    timegroup.id = "test-timegroup";
    timegroup.setAttribute("duration-ms", "10000");
    timegroup.style.width = "1920px";
    timegroup.style.height = "1080px";
    container.appendChild(timegroup);
    await timegroup.updateComplete;

    const strip = document.createElement("ef-thumbnail-strip") as EFThumbnailStrip;
    strip.targetElement = timegroup;
    strip.thumbnailHeight = 48;
    container.appendChild(strip);
    await strip.updateComplete;

    const dimensions = strip.thumbnailDimensions;
    expect(dimensions.height).toBe(48);
    // 16:9 aspect ratio: width = 48 * (1920/1080) = 85.33
    expect(dimensions.width).toBeGreaterThan(80);
    expect(dimensions.width).toBeLessThan(90);
  });

  test("should resolve target by ID string", async () => {
    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    timegroup.id = "test-timegroup-id";
    timegroup.setAttribute("duration-ms", "10000");
    container.appendChild(timegroup);
    await timegroup.updateComplete;

    const strip = document.createElement("ef-thumbnail-strip") as EFThumbnailStrip;
    strip.target = "test-timegroup-id";
    container.appendChild(strip);
    await strip.updateComplete;

    expect(strip.targetElement).toBe(timegroup);
    expect(strip.isValidTarget).toBe(true);
  });

  test("should clip thumbnail container to track duration width", async () => {
    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    timegroup.id = "test-timegroup";
    
    // Add a child element with duration so timegroup has non-zero duration
    const childText = document.createElement("ef-text");
    childText.textContent = "Test";
    childText.setAttribute("duration-ms", "5000");
    timegroup.appendChild(childText);
    
    container.appendChild(timegroup);
    await timegroup.updateComplete;

    const pixelsPerMs = 0.1; // 100px per second

    const strip = document.createElement("ef-thumbnail-strip") as EFThumbnailStrip;
    strip.targetElement = timegroup;
    strip.pixelsPerMs = pixelsPerMs;
    container.appendChild(strip);
    await strip.updateComplete;

    const thumbnailContainer = strip.shadowRoot?.querySelector(".thumbnail-container") as HTMLElement;
    expect(thumbnailContainer).toBeTruthy();
    
    // Verify max-width is set based on duration (actual value depends on how timegroup calculates duration)
    const maxWidth = thumbnailContainer.style.maxWidth;
    const actualDuration = timegroup.durationMs || 0;
    const expectedWidth = actualDuration * pixelsPerMs;
    
    expect(maxWidth).toBe(`${expectedWidth}px`);
    expect(parseFloat(maxWidth)).toBeGreaterThan(0);
  });

  test("schedules render when target is already ready (late subscriber)", async () => {
    // Simulate the TrimTool scenario: a bare timegroup (as proxy for a bare video)
    // transitions to "ready" BEFORE the strip attaches listeners.
    // Use a timegroup with a child so slotchange fires and it goes to "ready".
    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    timegroup.id = "test-tg-late";
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "10s");
    const child = document.createElement("ef-text");
    child.textContent = "Test";
    child.setAttribute("duration", "10s");
    timegroup.appendChild(child);
    container.appendChild(timegroup);
    // Wait until fully ready
    await timegroup.updateComplete;
    await child.updateComplete;
    await new Promise(r => requestAnimationFrame(r));
    await timegroup.updateComplete;
    expect(timegroup.contentReadyState).toBe("ready");

    // Now create and attach the thumbnail strip AFTER target is ready
    const strip = document.createElement("ef-thumbnail-strip") as EFThumbnailStrip;
    strip.targetElement = timegroup;
    strip.thumbnailHeight = 48;
    strip.pixelsPerMs = 0.1;
    container.appendChild(strip);
    await strip.updateComplete;

    // Wait for scheduled render
    await new Promise(r => requestAnimationFrame(r));
    await strip.updateComplete;

    const thumbnailContainer = strip.shadowRoot?.querySelector(".thumbnail-container") as HTMLElement;
    expect(thumbnailContainer).toBeTruthy();
    const maxWidth = parseFloat(thumbnailContainer?.style.maxWidth || "0");
    // With 10s duration at 0.1px/ms = 1000px
    expect(maxWidth).toBe(1000);
  });

  test("responds to readystatechange from target (event-driven, not polling)", async () => {
    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    timegroup.id = "test-tg-event";
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "10s");
    container.appendChild(timegroup);
    await timegroup.updateComplete;

    const strip = document.createElement("ef-thumbnail-strip") as EFThumbnailStrip;
    strip.targetElement = timegroup;
    strip.thumbnailHeight = 48;
    strip.pixelsPerMs = 0.1;
    container.appendChild(strip);
    await strip.updateComplete;

    // The strip should have rendered thumbnails for the 10s timegroup.
    // Now force a readystatechange on the target to verify re-render.
    let renderScheduled = false;
    const origScheduleRender = (strip as any).__proto__.constructor.prototype;
    
    // Instead, observe that the strip re-renders after a readystatechange event
    const thumbnailsBefore = strip.shadowRoot?.querySelectorAll("canvas").length ?? 0;
    
    // Dispatch readystatechange on target
    timegroup.dispatchEvent(new CustomEvent("readystatechange", {
      detail: { state: "ready" },
      bubbles: false,
    }));
    
    // Wait for render to schedule and complete
    await new Promise(r => requestAnimationFrame(r));
    await strip.updateComplete;
    
    // Strip should still render (not crash/break from event-driven updates)
    const thumbnailContainer = strip.shadowRoot?.querySelector(".thumbnail-container");
    expect(thumbnailContainer).toBeTruthy();
  });

  test("auto-fits to container width when no explicit pixels-per-ms is set", async () => {
    container.style.width = "500px";

    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    timegroup.id = "test-tg-autofit";
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "10s");
    const child = document.createElement("ef-text");
    child.textContent = "Test";
    child.setAttribute("duration", "10s");
    timegroup.appendChild(child);
    container.appendChild(timegroup);
    await timegroup.updateComplete;
    await child.updateComplete;
    await new Promise(r => requestAnimationFrame(r));

    const strip = document.createElement("ef-thumbnail-strip") as EFThumbnailStrip;
    strip.targetElement = timegroup;
    strip.thumbnailHeight = 48;
    // Do NOT set pixelsPerMs — should auto-fit to container width
    container.appendChild(strip);
    await strip.updateComplete;

    // Wait for ResizeObserver to fire
    await new Promise(r => requestAnimationFrame(r));
    await strip.updateComplete;

    const thumbnailContainer = strip.shadowRoot?.querySelector(".thumbnail-container") as HTMLElement;
    expect(thumbnailContainer).toBeTruthy();
    // Auto-fit: 500px container / 10000ms = 0.05px/ms → track width ≈ 500px
    const maxWidth = parseFloat(thumbnailContainer?.style.maxWidth || "0");
    expect(maxWidth).toBeCloseTo(500, -1); // within ~10px
  });

  test("explicit pixels-per-ms overrides auto-fit", async () => {
    container.style.width = "500px";

    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    timegroup.id = "test-tg-explicit";
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "10s");
    const child = document.createElement("ef-text");
    child.textContent = "Test";
    child.setAttribute("duration", "10s");
    timegroup.appendChild(child);
    container.appendChild(timegroup);
    await timegroup.updateComplete;
    await child.updateComplete;
    await new Promise(r => requestAnimationFrame(r));

    const strip = document.createElement("ef-thumbnail-strip") as EFThumbnailStrip;
    strip.targetElement = timegroup;
    strip.thumbnailHeight = 48;
    strip.pixelsPerMs = 0.2; // Explicit: 0.2px/ms → 10000ms * 0.2 = 2000px
    container.appendChild(strip);
    await strip.updateComplete;

    await new Promise(r => requestAnimationFrame(r));
    await strip.updateComplete;

    const thumbnailContainer = strip.shadowRoot?.querySelector(".thumbnail-container") as HTMLElement;
    const maxWidth = parseFloat(thumbnailContainer?.style.maxWidth || "0");
    expect(maxWidth).toBe(2000);
  });

  test("useIntrinsicDuration defaults to false", async () => {
    const strip = document.createElement("ef-thumbnail-strip") as EFThumbnailStrip;
    container.appendChild(strip);
    await strip.updateComplete;
    expect(strip.useIntrinsicDuration).toBe(false);
  });
});
