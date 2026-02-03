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
});
