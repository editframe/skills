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

async function waitForVideoCanvas(video: EFVideo, expectedWidth: number, expectedHeight: number) {
  const canvas = (video as any).canvasElement;
  let attempts = 0;
  while (attempts < 50) {
    if (canvas.width === expectedWidth && canvas.height === expectedHeight) {
      return;
    }
    await new Promise(resolve => requestAnimationFrame(resolve));
    attempts++;
  }
  throw new Error(`Canvas did not resize to ${expectedWidth}x${expectedHeight} after 50 frames. Got ${canvas.width}x${canvas.height}`);
}

describe("EFFitScale", () => {
  beforeEach(async () => {
    await fetch("/@ef-clear-cache", { method: "DELETE" });
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  test("scales video to fit container while maintaining aspect ratio", async ({ expect }) => {
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

    // Wait for canvas to be sized to video dimensions (384x216)
    await waitForVideoCanvas(video, 384, 216);
    
    // Wait a frame for fit-scale to measure and apply transform
    await new Promise(resolve => requestAnimationFrame(resolve));

    const scaleInfo = (fitScale as any).scaleInfo;
    
    // Container should be 500x500
    expect(scaleInfo.containerWidth).toBe(500);
    expect(scaleInfo.containerHeight).toBe(500);
    
    // Video should have its natural dimensions (384x216)
    expect(scaleInfo.contentWidth).toBe(384);
    expect(scaleInfo.contentHeight).toBe(216);
    
    // Scale should fit the video to the container
    // For 384x216 video in 500x500 container:
    // Container ratio: 1.0, Video ratio: 1.778
    // Video is wider than container, so scale by width: 500/384 = 1.302
    expect(scaleInfo.scale).toBeCloseTo(500 / 384, 2);
    
    // Video should have transform applied
    const videoTransform = window.getComputedStyle(video).transform;
    expect(videoTransform).not.toBe("none");

    const rect = video.getBoundingClientRect();
    // Should be 500 x (500 / (384/216)) = 281.25
    expect(rect.width).toBeCloseTo(500, 1);
    expect(rect.height).toBeCloseTo(281.25, 1);
  }, 1000);

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

    // Wait for canvas to be sized to video dimensions (384x216)
    await waitForVideoCanvas(video, 384, 216);
    
    await new Promise(resolve => requestAnimationFrame(resolve));

    const scaleInfo = (fitScale as any).scaleInfo;
    
    // Container is 300x800 (ratio 0.375), video is 384x216 (ratio 1.778)
    // Should scale by width: 300/384
    expect(scaleInfo.scale).toBeCloseTo(300 / 384, 2);
  }, 1000);

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

    // Wait for canvas to be sized to video dimensions (384x216)
    await waitForVideoCanvas(video, 384, 216);
    
    await new Promise(resolve => requestAnimationFrame(resolve));

    const scaleInfo = (fitScale as any).scaleInfo;
    
    // Container is 1000x300 (ratio 3.33), video is 384x216 (ratio 1.778)
    // Should scale by height: 300/216
    expect(scaleInfo.scale).toBeCloseTo(300 / 216, 2);
  }, 1000);

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

    const video = container.querySelector("ef-video") as EFVideo;
    const timegroup = container.querySelector("ef-timegroup") as EFTimegroup;

    await timegroup.updateComplete;
    await video.updateComplete;
    await video.mediaEngineTask.taskComplete;
    await timegroup.seekTask.taskComplete;

    // Wait for canvas to be sized to video dimensions (384x216)
    await waitForVideoCanvas(video, 384, 216);
    
    await new Promise(resolve => requestAnimationFrame(resolve));

    // Transform should include translate for centering
    const videoTransform = window.getComputedStyle(video).transform;
    expect(videoTransform).toContain("matrix");
  }, 1000);

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

    // Wait for canvas to be sized to video dimensions (384x216)
    await waitForVideoCanvas(video, 384, 216);
    
    await new Promise(resolve => requestAnimationFrame(resolve));

    const initialScale = (fitScale as any).scaleInfo.scale;

    // Change container size
    timegroup.style.width = "800px";
    timegroup.style.height = "600px";
    
    await new Promise(resolve => requestAnimationFrame(resolve));
    await new Promise(resolve => requestAnimationFrame(resolve));

    const newScale = (fitScale as any).scaleInfo.scale;
    
    // Scale should have changed
    expect(newScale).not.toBe(initialScale);
  }, 1000);

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

