import { expect, test, describe } from "vitest";
import "./EFThumbnailStrip.js";
import "../../EFWorkbench.js";
import "../../../elements/EFTimegroup.js";
import "../../../elements/EFVideo.js";

describe("EFThumbnailStrip", () => {
  test("shows error when no target specified", async () => {
    const strip = document.createElement("ef-thumbnail-strip");
    document.body.appendChild(strip);

    await strip.updateComplete;

    const errorMessage = strip.shadowRoot?.querySelector(".error-message");
    expect(errorMessage).toBeTruthy();
    expect(errorMessage?.textContent).toContain("No target specified");

    strip.remove();
  });

  test("shows error when target element not found", async () => {
    const strip = document.createElement("ef-thumbnail-strip");
    strip.setAttribute("target", "nonexistent-element");
    document.body.appendChild(strip);

    await strip.updateComplete;

    const errorMessage = strip.shadowRoot?.querySelector(".error-message");
    expect(errorMessage).toBeTruthy();
    expect(errorMessage?.textContent).toContain("not found");

    strip.remove();
  });

  test("shows error for invalid target type", async () => {
    const div = document.createElement("div");
    div.id = "test-div";
    document.body.appendChild(div);

    const strip = document.createElement("ef-thumbnail-strip");
    strip.setAttribute("target", "test-div");
    document.body.appendChild(strip);

    await strip.updateComplete;

    const errorMessage = strip.shadowRoot?.querySelector(".error-message");
    expect(errorMessage).toBeTruthy();
    expect(errorMessage?.textContent).toContain("Invalid target");

    strip.remove();
    div.remove();
  });

  test("accepts ef-video as valid target", async () => {
    const video = document.createElement("ef-video");
    video.id = "test-video";
    video.setAttribute("src", "https://example.com/video.mp4");
    document.body.appendChild(video);

    const strip = document.createElement("ef-thumbnail-strip");
    strip.setAttribute("target", "test-video");
    document.body.appendChild(strip);

    await strip.updateComplete;

    const errorMessage = strip.shadowRoot?.querySelector(".error-message");
    expect(errorMessage).toBeFalsy();

    strip.remove();
    video.remove();
  });

  test("accepts root ef-timegroup as valid target", async () => {
    const timegroup = document.createElement("ef-timegroup");
    timegroup.id = "test-timegroup";
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "10s");
    document.body.appendChild(timegroup);

    const strip = document.createElement("ef-thumbnail-strip");
    strip.setAttribute("target", "test-timegroup");
    document.body.appendChild(strip);

    await strip.updateComplete;

    const errorMessage = strip.shadowRoot?.querySelector(".error-message");
    expect(errorMessage).toBeFalsy();

    strip.remove();
    timegroup.remove();
  });

  test("rejects nested ef-timegroup", async () => {
    const rootTimegroup = document.createElement("ef-timegroup");
    rootTimegroup.id = "root-timegroup";
    rootTimegroup.setAttribute("mode", "fixed");
    rootTimegroup.setAttribute("duration", "10s");
    document.body.appendChild(rootTimegroup);

    const nestedTimegroup = document.createElement("ef-timegroup");
    nestedTimegroup.id = "nested-timegroup";
    nestedTimegroup.setAttribute("mode", "fixed");
    nestedTimegroup.setAttribute("duration", "5s");
    rootTimegroup.appendChild(nestedTimegroup);

    await rootTimegroup.updateComplete;
    await nestedTimegroup.updateComplete;

    const strip = document.createElement("ef-thumbnail-strip");
    strip.setAttribute("target", "nested-timegroup");
    document.body.appendChild(strip);

    await strip.updateComplete;

    const errorMessage = strip.shadowRoot?.querySelector(".error-message");
    expect(errorMessage).toBeTruthy();
    expect(errorMessage?.textContent).toContain("Invalid target");

    strip.remove();
    rootTimegroup.remove();
  });

  test("configures thumbnail height and spacing", async () => {
    const video = document.createElement("ef-video");
    video.id = "test-video-config";
    video.setAttribute("src", "https://example.com/video.mp4");
    document.body.appendChild(video);

    const strip = document.createElement("ef-thumbnail-strip") as any;
    strip.setAttribute("target", "test-video-config");
    strip.setAttribute("thumbnail-height", "48");
    strip.setAttribute("thumbnail-spacing-px", "96");
    document.body.appendChild(strip);

    await strip.updateComplete;

    expect(strip.thumbnailHeight).toBe(48);
    expect(strip.thumbnailSpacingPx).toBe(96);

    strip.remove();
    video.remove();
  });
});
