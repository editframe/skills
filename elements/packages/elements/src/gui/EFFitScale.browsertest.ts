import { html, render } from "lit";
import { afterEach, beforeEach, describe, expect } from "vitest";

import { test as baseTest } from "../../test/useMSW.js";
import { getApiHost } from "../../test/setup.js";
import "../elements/EFVideo.js";
import "../elements/EFTimegroup.js";
import "./EFFitScale.js";
import "./EFPreview.js";

import type { EFVideo } from "../elements/EFVideo.js";
import type { EFTimegroup } from "../elements/EFTimegroup.js";
import type { EFFitScale } from "./EFFitScale.js";

const test = baseTest.extend({});

async function waitForVideoCanvas(
  video: EFVideo,
  expectedWidth: number,
  expectedHeight: number,
) {
  const canvas = (video as any).canvasElement;
  let attempts = 0;
  while (attempts < 50) {
    if (canvas.width === expectedWidth && canvas.height === expectedHeight) {
      return;
    }
    await new Promise((resolve) => requestAnimationFrame(resolve));
    attempts++;
  }
  throw new Error(
    `Canvas did not resize to ${expectedWidth}x${expectedHeight} after 50 frames. Got ${canvas.width}x${canvas.height}`,
  );
}

describe("EFFitScale", () => {
  beforeEach(async () => {
    await fetch("/@ef-clear-cache", { method: "DELETE" });
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  test("scales video to fit container while maintaining aspect ratio", async ({
    expect,
  }) => {
    const container = document.createElement("div");
    const apiHost = getApiHost();

    render(
      html`
        <ef-configuration api-host="${apiHost}" signing-url="">
          <ef-preview>
            <ef-timegroup mode="sequence" style="width: 500px; height: 500px;">
              <ef-fit-scale>
                <ef-video src="bars-n-tone.mp4"></ef-video>
              </ef-fit-scale>
            </ef-timegroup>
          </ef-preview>
        </ef-configuration>
      `,
      container,
    );
    document.body.appendChild(container);

    const fitScale = container.querySelector("ef-fit-scale") as EFFitScale;
    const video = container.querySelector("ef-video") as EFVideo;
    const timegroup = container.querySelector("ef-timegroup") as EFTimegroup;

    await timegroup.updateComplete;
    await video.updateComplete;
    await video.mediaEngineTask.taskComplete;
    await timegroup.seekTask.taskComplete;

    // Wait for fit-scale to measure and apply transform
    // Use multiple RAF to ensure layout is complete
    for (let i = 0; i < 5; i++) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }

    // Observable outcome 1: Video should have a transform applied
    const videoTransform = window.getComputedStyle(video).transform;
    expect(videoTransform).not.toBe("none");

    // Observable outcome 2: Video's visual bounding box should fit within container
    const rect = video.getBoundingClientRect();
    const containerRect = fitScale.getBoundingClientRect();
    
    // Video should fit within container width (with some tolerance for borders)
    expect(rect.width).toBeLessThanOrEqual(containerRect.width + 2);
    
    // Observable outcome 3: Video maintains aspect ratio (wider than tall)
    expect(rect.width).toBeGreaterThan(rect.height);
    
    // Observable outcome 4: Video is scaled up to fill container width
    expect(rect.width).toBeCloseTo(containerRect.width, 1);
  }, 5000);

  test("scales video in tall container (letterboxing)", async ({ expect }) => {
    const container = document.createElement("div");
    const apiHost = getApiHost();

    render(
      html`
        <ef-configuration api-host="${apiHost}" signing-url="">
          <ef-preview>
            <ef-timegroup mode="sequence" style="width: 300px; height: 800px;">
              <ef-fit-scale>
                <ef-video src="bars-n-tone.mp4"></ef-video>
              </ef-fit-scale>
            </ef-timegroup>
          </ef-preview>
        </ef-configuration>
      `,
      container,
    );
    document.body.appendChild(container);

    const fitScale = container.querySelector("ef-fit-scale") as EFFitScale;
    const video = container.querySelector("ef-video") as EFVideo;
    const timegroup = container.querySelector("ef-timegroup") as EFTimegroup;

    await timegroup.updateComplete;
    await video.updateComplete;
    await video.mediaEngineTask.taskComplete;
    await timegroup.seekTask.taskComplete;

    // Wait for fit-scale to measure and apply transform
    for (let i = 0; i < 5; i++) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }

    // Observable outcome: Video's visual bounding box
    const rect = video.getBoundingClientRect();
    const containerRect = fitScale.getBoundingClientRect();

    // In a tall container (300x800), video should be constrained by width
    // Observable: video width should match or be close to container width
    expect(rect.width).toBeCloseTo(containerRect.width, 1);
    
    // Observable: video should maintain aspect ratio (wider than tall)
    expect(rect.width).toBeGreaterThan(rect.height);
    
    // Observable: video height should be less than container height (letterboxed)
    expect(rect.height).toBeLessThan(containerRect.height);
  }, 5000);

  test("scales video in wide container (pillarboxing)", async ({ expect }) => {
    const container = document.createElement("div");
    const apiHost = getApiHost();

    render(
      html`
        <ef-configuration api-host="${apiHost}" signing-url="">
          <ef-preview>
            <ef-timegroup mode="sequence" style="width: 1000px; height: 300px;">
              <ef-fit-scale>
                <ef-video src="bars-n-tone.mp4"></ef-video>
              </ef-fit-scale>
            </ef-timegroup>
          </ef-preview>
        </ef-configuration>
      `,
      container,
    );
    document.body.appendChild(container);

    const fitScale = container.querySelector("ef-fit-scale") as EFFitScale;
    const video = container.querySelector("ef-video") as EFVideo;
    const timegroup = container.querySelector("ef-timegroup") as EFTimegroup;

    await timegroup.updateComplete;
    await video.updateComplete;
    await video.mediaEngineTask.taskComplete;
    await timegroup.seekTask.taskComplete;

    // Wait for fit-scale to measure and apply transform
    for (let i = 0; i < 5; i++) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }

    // Observable outcome: Video's visual bounding box
    const rect = video.getBoundingClientRect();
    const containerRect = fitScale.getBoundingClientRect();

    // In a wide container (1000x300), video should be constrained by height
    // Observable: video height should match or be close to container height
    expect(rect.height).toBeCloseTo(containerRect.height, 1);
    
    // Observable: video should maintain aspect ratio (wider than tall)
    expect(rect.width).toBeGreaterThan(rect.height);
    
    // Observable: video width should be less than container width (pillarboxed)
    expect(rect.width).toBeLessThan(containerRect.width);
  }, 5000);

  test("centers video in container", async ({ expect }) => {
    const container = document.createElement("div");
    const apiHost = getApiHost();

    render(
      html`
        <ef-configuration api-host="${apiHost}" signing-url="">
          <ef-preview>
            <ef-timegroup mode="sequence" style="width: 500px; height: 500px;">
              <ef-fit-scale>
                <ef-video src="bars-n-tone.mp4"></ef-video>
              </ef-fit-scale>
            </ef-timegroup>
          </ef-preview>
        </ef-configuration>
      `,
      container,
    );
    document.body.appendChild(container);

    const fitScale = container.querySelector("ef-fit-scale") as EFFitScale;
    const video = container.querySelector("ef-video") as EFVideo;
    const timegroup = container.querySelector("ef-timegroup") as EFTimegroup;

    await timegroup.updateComplete;
    await video.updateComplete;
    await video.mediaEngineTask.taskComplete;
    await timegroup.seekTask.taskComplete;

    // Wait for fit-scale to measure and apply transform
    for (let i = 0; i < 5; i++) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }

    // Observable outcome: Video should be centered within the container
    const videoRect = video.getBoundingClientRect();
    const containerRect = fitScale.getBoundingClientRect();

    // Calculate expected center positions
    const containerCenterX = containerRect.left + containerRect.width / 2;
    const containerCenterY = containerRect.top + containerRect.height / 2;
    const videoCenterX = videoRect.left + videoRect.width / 2;
    const videoCenterY = videoRect.top + videoRect.height / 2;

    // Video center should be close to container center
    expect(Math.abs(videoCenterX - containerCenterX)).toBeLessThan(5);
    expect(Math.abs(videoCenterY - containerCenterY)).toBeLessThan(5);
  }, 5000);

  test("updates scale when container size changes", async ({ expect }) => {
    const container = document.createElement("div");
    const apiHost = getApiHost();

    render(
      html`
        <ef-configuration api-host="${apiHost}" signing-url="">
          <ef-preview>
            <ef-timegroup mode="sequence" id="resizable-container" style="width: 500px; height: 500px;">
              <ef-fit-scale>
                <ef-video src="bars-n-tone.mp4"></ef-video>
              </ef-fit-scale>
            </ef-timegroup>
          </ef-preview>
        </ef-configuration>
      `,
      container,
    );
    document.body.appendChild(container);

    const fitScale = container.querySelector("ef-fit-scale") as EFFitScale;
    const video = container.querySelector("ef-video") as EFVideo;
    const timegroup = container.querySelector("ef-timegroup") as EFTimegroup;

    await timegroup.updateComplete;
    await video.updateComplete;
    await video.mediaEngineTask.taskComplete;
    await timegroup.seekTask.taskComplete;

    // Wait for fit-scale to measure and apply transform
    for (let i = 0; i < 5; i++) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }

    // Get initial video dimensions
    const initialRect = video.getBoundingClientRect();
    const initialWidth = initialRect.width;

    // Change container size to be larger
    timegroup.style.width = "800px";
    timegroup.style.height = "600px";

    // Wait for layout to update
    for (let i = 0; i < 10; i++) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }

    // Observable outcome: video dimensions should have changed
    const newRect = video.getBoundingClientRect();
    
    // Video should now be larger (container is bigger)
    expect(newRect.width).toBeGreaterThan(initialWidth);
    
    // Video should still be centered
    const containerRect = fitScale.getBoundingClientRect();
    const containerCenterX = containerRect.left + containerRect.width / 2;
    const videoCenterX = newRect.left + newRect.width / 2;
    expect(Math.abs(videoCenterX - containerCenterX)).toBeLessThan(5);
  }, 5000);

  test("handles video without ef-fit-scale normally", async ({ expect }) => {
    const container = document.createElement("div");
    const apiHost = getApiHost();

    render(
      html`
        <ef-configuration api-host="${apiHost}" signing-url="">
          <ef-preview>
            <ef-timegroup mode="sequence" style="width: 500px; height: 500px;">
              <ef-video src="bars-n-tone.mp4" style="width: 100%; height: 100%;"></ef-video>
            </ef-timegroup>
          </ef-preview>
        </ef-configuration>
      `,
      container,
    );
    document.body.appendChild(container);

    const video = container.querySelector("ef-video") as EFVideo;
    const timegroup = container.querySelector("ef-timegroup") as EFTimegroup;

    await timegroup.updateComplete;
    await video.updateComplete;
    await video.mediaEngineTask.taskComplete;
    await timegroup.seekTask.taskComplete;

    // Video should not have fit-scale transform
    const videoTransform = window.getComputedStyle(video).transform;
    expect(videoTransform).toBe("none");

    // Canvas should use 100% sizing
    const canvas = (video as any).canvasElement;
    const canvasStyle = window.getComputedStyle(canvas);
    expect(canvasStyle.width).toBe("500px");
    expect(canvasStyle.height).toBe("500px");
  }, 1000);
});
