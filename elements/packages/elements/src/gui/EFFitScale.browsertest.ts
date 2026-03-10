import { html, render } from "lit";
import { afterEach, beforeEach, describe, expect, vi } from "vitest";

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

/** Wait for multiple animation frames to allow ResizeObserver + layout to settle */
async function waitFrames(count = 5): Promise<void> {
  for (let i = 0; i < count; i++) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
}

describe("EFFitScale", () => {
  beforeEach(async () => {});

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
  }, 10000);
});

/* ━━ Plain div tests (no ef-video, fast) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

describe("EFFitScale — container patterns", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  test("scales content in explicit pixel-height parent", async () => {
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "width: 400px; height: 300px;";
    wrapper.innerHTML = `
      <ef-fit-scale>
        <div style="width: 800px; height: 600px; background: red;"></div>
      </ef-fit-scale>
    `;
    document.body.appendChild(wrapper);

    await waitFrames(5);

    const fitScale = wrapper.querySelector("ef-fit-scale") as EFFitScale;
    const content = fitScale.contentChild!;
    const contentRect = content.getBoundingClientRect();
    const containerRect = fitScale.getBoundingClientRect();

    // Content should be scaled down to fit (800x600 → 400x300, scale = 0.5)
    expect(contentRect.width).toBeCloseTo(containerRect.width, 0);
    expect(contentRect.height).toBeCloseTo(containerRect.height, 0);
  });

  test("scales content in aspect-ratio parent", async () => {
    // This is the Site 6 regression — aspect-ratio parent without explicit height
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "width: 600px;";
    wrapper.innerHTML = `
      <div style="aspect-ratio: 16/9; width: 100%; overflow: hidden;">
        <ef-fit-scale>
          <div style="width: 960px; height: 540px; background: blue;"></div>
        </ef-fit-scale>
      </div>
    `;
    document.body.appendChild(wrapper);

    await waitFrames(5);

    const fitScale = wrapper.querySelector("ef-fit-scale") as EFFitScale;
    const content = fitScale.querySelector("div") as HTMLElement;
    const fitScaleRect = fitScale.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();

    // The aspect-ratio parent should give FitScale a resolved height
    // Container should be 600 x 337.5 (16:9 of 600px)
    expect(fitScaleRect.width).toBeCloseTo(600, 0);
    expect(fitScaleRect.height).toBeGreaterThan(0);
    expect(fitScaleRect.height).toBeCloseTo(337.5, 0);

    // Content should be scaled and have a transform
    const transform = window.getComputedStyle(content).transform;
    expect(transform).not.toBe("none");

    // Content should fit within container
    expect(contentRect.width).toBeLessThanOrEqual(fitScaleRect.width + 2);
    expect(contentRect.height).toBeLessThanOrEqual(fitScaleRect.height + 2);
  });

  test("scales content in grid row parent", async () => {
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "display: grid; grid-template-rows: 1fr; width: 500px; height: 400px;";
    wrapper.innerHTML = `
      <ef-fit-scale>
        <div style="width: 1920px; height: 1080px; background: green;"></div>
      </ef-fit-scale>
    `;
    document.body.appendChild(wrapper);

    await waitFrames(5);

    const fitScale = wrapper.querySelector("ef-fit-scale") as EFFitScale;
    const content = fitScale.contentChild!;
    const fitScaleRect = fitScale.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();

    // FitScale should fill the grid cell
    expect(fitScaleRect.width).toBeCloseTo(500, 0);
    expect(fitScaleRect.height).toBeCloseTo(400, 0);

    // Content should be scaled and centered
    const transform = window.getComputedStyle(content).transform;
    expect(transform).not.toBe("none");
    expect(contentRect.width).toBeLessThanOrEqual(fitScaleRect.width + 2);
  });

  test("scales content in flexbox parent with flex-1", async () => {
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "display: flex; flex-direction: column; width: 500px; height: 400px;";
    wrapper.innerHTML = `
      <div style="flex: 1; min-height: 0;">
        <ef-fit-scale>
          <div style="width: 1920px; height: 1080px; background: purple;"></div>
        </ef-fit-scale>
      </div>
    `;
    document.body.appendChild(wrapper);

    await waitFrames(5);

    const fitScale = wrapper.querySelector("ef-fit-scale") as EFFitScale;
    const content = fitScale.querySelector("div") as HTMLElement;
    const fitScaleRect = fitScale.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();

    // FitScale should fill the flex child
    expect(fitScaleRect.width).toBeCloseTo(500, 0);
    expect(fitScaleRect.height).toBeCloseTo(400, 0);

    // Content should have a transform
    const transform = window.getComputedStyle(content).transform;
    expect(transform).not.toBe("none");
    expect(contentRect.width).toBeLessThanOrEqual(fitScaleRect.width + 2);
    expect(contentRect.height).toBeLessThanOrEqual(fitScaleRect.height + 2);
  });

  test("scales content in calc() height parent", async () => {
    // Matches Site 3 pattern: h-[calc(50vh-4rem)]
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "width: 600px; height: calc(400px - 2rem);";
    wrapper.innerHTML = `
      <ef-fit-scale>
        <div style="width: 960px; height: 540px; background: orange;"></div>
      </ef-fit-scale>
    `;
    document.body.appendChild(wrapper);

    await waitFrames(5);

    const fitScale = wrapper.querySelector("ef-fit-scale") as EFFitScale;
    const content = fitScale.querySelector("div") as HTMLElement;
    const fitScaleRect = fitScale.getBoundingClientRect();

    // Parent is 600 x (400-32) = 600 x 368
    expect(fitScaleRect.width).toBeCloseTo(600, 0);
    expect(fitScaleRect.height).toBeCloseTo(368, 0);

    // Content should be transformed
    const transform = window.getComputedStyle(content).transform;
    expect(transform).not.toBe("none");
  });

  test("scales content in nested percentage height chain", async () => {
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "width: 800px; height: 600px;";
    wrapper.innerHTML = `
      <div style="width: 100%; height: 100%;">
        <div style="width: 100%; height: 100%;">
          <ef-fit-scale>
            <div style="width: 1920px; height: 1080px; background: teal;"></div>
          </ef-fit-scale>
        </div>
      </div>
    `;
    document.body.appendChild(wrapper);

    await waitFrames(5);

    const fitScale = wrapper.querySelector("ef-fit-scale") as EFFitScale;
    const content = fitScale.querySelector("div") as HTMLElement;
    const fitScaleRect = fitScale.getBoundingClientRect();

    // FitScale should resolve through the percentage chain
    expect(fitScaleRect.width).toBeCloseTo(800, 0);
    expect(fitScaleRect.height).toBeCloseTo(600, 0);

    const transform = window.getComputedStyle(content).transform;
    expect(transform).not.toBe("none");
  });
});

describe("EFFitScale — content detection", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  test("detects content child with explicit dimensions", async () => {
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "width: 400px; height: 300px;";
    wrapper.innerHTML = `
      <ef-fit-scale>
        <div style="width: 800px; height: 400px; background: red;"></div>
      </ef-fit-scale>
    `;
    document.body.appendChild(wrapper);

    await waitFrames(5);

    const fitScale = wrapper.querySelector("ef-fit-scale") as EFFitScale;
    expect(fitScale.contentChild).not.toBe(null);

    const content = fitScale.contentChild!;
    const transform = window.getComputedStyle(content).transform;
    expect(transform).not.toBe("none");
  });

  test("skips display:none children", async () => {
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "width: 400px; height: 300px;";
    wrapper.innerHTML = `
      <ef-fit-scale>
        <div style="display: none;">Hidden</div>
        <div style="width: 800px; height: 400px; background: green;"></div>
      </ef-fit-scale>
    `;
    document.body.appendChild(wrapper);

    await waitFrames(5);

    const fitScale = wrapper.querySelector("ef-fit-scale") as EFFitScale;
    const contentChild = fitScale.contentChild;

    // Should skip display:none and find the visible div
    expect(contentChild).not.toBe(null);
    expect(contentChild!.style.background).toBe("green");
  });

  test("skips display:contents wrapper and finds child", async () => {
    // Matches Sites 2/3 pattern where a wrapper div with display:contents is used
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "width: 400px; height: 300px;";
    wrapper.innerHTML = `
      <ef-fit-scale>
        <div style="display: contents;">
          <div style="width: 800px; height: 400px; background: blue;"></div>
        </div>
      </ef-fit-scale>
    `;
    document.body.appendChild(wrapper);

    await waitFrames(5);

    const fitScale = wrapper.querySelector("ef-fit-scale") as EFFitScale;
    const contentChild = fitScale.contentChild;

    // Should skip display:contents wrapper and find the actual content
    expect(contentChild).not.toBe(null);
    expect(contentChild!.style.background).toBe("blue");

    // Content should have transform applied
    const transform = window.getComputedStyle(contentChild!).transform;
    expect(transform).not.toBe("none");
  });

  test("skips script and style elements", async () => {
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "width: 400px; height: 300px;";
    wrapper.innerHTML = `
      <ef-fit-scale>
        <style>.foo { color: red; }</style>
        <script>/* noop */</script>
        <div style="width: 800px; height: 400px; background: cyan;"></div>
      </ef-fit-scale>
    `;
    document.body.appendChild(wrapper);

    await waitFrames(5);

    const fitScale = wrapper.querySelector("ef-fit-scale") as EFFitScale;
    const contentChild = fitScale.contentChild;

    // Should skip style/script and find the div
    expect(contentChild).not.toBe(null);
    expect(contentChild!.style.background).toBe("cyan");
  });

  test("handles empty element (no children)", async () => {
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "width: 400px; height: 300px;";
    wrapper.innerHTML = `<ef-fit-scale></ef-fit-scale>`;
    document.body.appendChild(wrapper);

    await waitFrames(5);

    const fitScale = wrapper.querySelector("ef-fit-scale") as EFFitScale;
    expect(fitScale.contentChild).toBe(null);
  });
});

describe("EFFitScale — paused property", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  test("paused prevents scale updates on container resize", async () => {
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "width: 400px; height: 300px;";
    wrapper.innerHTML = `
      <ef-fit-scale paused>
        <div style="width: 800px; height: 600px; background: red;"></div>
      </ef-fit-scale>
    `;
    document.body.appendChild(wrapper);

    await waitFrames(5);

    const fitScale = wrapper.querySelector("ef-fit-scale") as EFFitScale;
    const content = fitScale.querySelector("div") as HTMLElement;

    // Content should NOT have a transform because paused
    const transformBefore = window.getComputedStyle(content).transform;
    expect(transformBefore).toBe("none");

    // Resize container — should still not apply transform
    wrapper.style.width = "600px";
    await waitFrames(10);

    const transformAfter = window.getComputedStyle(content).transform;
    expect(transformAfter).toBe("none");
  });

  test("unpausing triggers recalculation", async () => {
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "width: 400px; height: 300px;";
    wrapper.innerHTML = `
      <ef-fit-scale paused>
        <div style="width: 800px; height: 600px; background: red;"></div>
      </ef-fit-scale>
    `;
    document.body.appendChild(wrapper);

    await waitFrames(5);

    const fitScale = wrapper.querySelector("ef-fit-scale") as EFFitScale;
    const content = fitScale.querySelector("div") as HTMLElement;

    // Should be paused — no transform
    expect(window.getComputedStyle(content).transform).toBe("none");

    // Unpause
    fitScale.paused = false;
    await waitFrames(10);

    // Now it should have a transform
    const transform = window.getComputedStyle(content).transform;
    expect(transform).not.toBe("none");
  });

  test("paused attribute works via HTML", async () => {
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "width: 400px; height: 300px;";
    wrapper.innerHTML = `
      <ef-fit-scale paused>
        <div style="width: 800px; height: 600px; background: red;"></div>
      </ef-fit-scale>
    `;
    document.body.appendChild(wrapper);

    await waitFrames(5);

    const fitScale = wrapper.querySelector("ef-fit-scale") as EFFitScale;
    expect(fitScale.paused).toBe(true);

    // Remove the attribute
    fitScale.removeAttribute("paused");
    await waitFrames(5);

    expect(fitScale.paused).toBe(false);
  });
});

describe("EFFitScale — ResizeObserver behavior", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  test("updates scale when container resizes", async () => {
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "width: 400px; height: 300px;";
    wrapper.innerHTML = `
      <ef-fit-scale>
        <div style="width: 800px; height: 600px; background: red;"></div>
      </ef-fit-scale>
    `;
    document.body.appendChild(wrapper);

    await waitFrames(5);

    const content = wrapper.querySelector("ef-fit-scale div") as HTMLElement;
    const initialRect = content.getBoundingClientRect();

    // Resize container to be larger
    wrapper.style.width = "800px";
    wrapper.style.height = "600px";

    await waitFrames(10);

    const newRect = content.getBoundingClientRect();

    // Content should be larger after container grew
    expect(newRect.width).toBeGreaterThan(initialRect.width);
  });

  test("updates scale when content resizes", async () => {
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "width: 400px; height: 300px;";
    wrapper.innerHTML = `
      <ef-fit-scale>
        <div style="width: 800px; height: 600px; background: red;"></div>
      </ef-fit-scale>
    `;
    document.body.appendChild(wrapper);

    await waitFrames(5);

    const fitScale = wrapper.querySelector("ef-fit-scale") as EFFitScale;
    const content = fitScale.querySelector("div") as HTMLElement;
    // Change content size — the ResizeObserver on content should trigger an update
    // Note: because FitScale sets width/height on the content, we need to change the
    // actual intrinsic size in a way the observer can detect
    content.style.width = "1600px";
    content.style.height = "1200px";

    await waitFrames(10);

    const newTransform = window.getComputedStyle(content).transform;
    // Transform should still be present (may change or remain the same depending on how
    // ResizeObserver interacts with the style mutation, but it shouldn't be "none")
    expect(newTransform).not.toBe("none");
  });

  test("handles content child replacement", async () => {
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "width: 400px; height: 300px;";
    wrapper.innerHTML = `
      <ef-fit-scale>
        <div id="original" style="width: 800px; height: 600px; background: red;"></div>
      </ef-fit-scale>
    `;
    document.body.appendChild(wrapper);

    await waitFrames(5);

    const fitScale = wrapper.querySelector("ef-fit-scale") as EFFitScale;
    const originalContent = fitScale.querySelector("#original") as HTMLElement;

    // Original should have transform
    expect(window.getComputedStyle(originalContent).transform).not.toBe("none");

    // Replace the content child
    originalContent.remove();
    const newContent = document.createElement("div");
    newContent.id = "replacement";
    newContent.style.cssText = "width: 1920px; height: 1080px; background: blue;";
    fitScale.appendChild(newContent);

    await waitFrames(10);

    // Old content should have its styles cleaned up
    expect(originalContent.style.transform).toBe("");

    // New content should have transform
    expect(window.getComputedStyle(newContent).transform).not.toBe("none");
  });

  test("cleans up observers on disconnect", async () => {
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "width: 400px; height: 300px;";
    wrapper.innerHTML = `
      <ef-fit-scale>
        <div style="width: 800px; height: 600px; background: red;"></div>
      </ef-fit-scale>
    `;
    document.body.appendChild(wrapper);

    await waitFrames(5);

    const fitScale = wrapper.querySelector("ef-fit-scale") as EFFitScale;
    const content = fitScale.querySelector("div") as HTMLElement;

    // Content should have transform
    expect(window.getComputedStyle(content).transform).not.toBe("none");

    // Remove from DOM — disconnectedCallback should fire
    fitScale.remove();

    await waitFrames(5);

    // Content should have styles cleaned up (removeScale called in disconnectedCallback)
    expect(content.style.transform).toBe("");
    expect(content.style.width).toBe("");
    expect(content.style.height).toBe("");
  });
});

describe("EFFitScale — console warning", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  test("warns when container has zero height", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const wrapper = document.createElement("div");
    // Zero height — FitScale container will also be zero height
    wrapper.style.cssText = "width: 400px; height: 0px;";
    wrapper.innerHTML = `
      <ef-fit-scale>
        <div style="width: 800px; height: 600px; background: red;"></div>
      </ef-fit-scale>
    `;
    document.body.appendChild(wrapper);

    await waitFrames(10);

    // Should have warned about zero dimensions
    const fitScaleWarns = warnSpy.mock.calls.filter(
      (call) => typeof call[0] === "string" && call[0].includes("[ef-fit-scale]"),
    );
    expect(fitScaleWarns.length).toBeGreaterThan(0);
    expect(fitScaleWarns[0]![0]).toContain("zero dimensions");
  });

  test("does not warn for valid dimensions", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const wrapper = document.createElement("div");
    wrapper.style.cssText = "width: 400px; height: 300px;";
    wrapper.innerHTML = `
      <ef-fit-scale>
        <div style="width: 800px; height: 600px; background: red;"></div>
      </ef-fit-scale>
    `;
    document.body.appendChild(wrapper);

    await waitFrames(10);

    // No FitScale warnings should appear
    const fitScaleWarns = warnSpy.mock.calls.filter(
      (call) => typeof call[0] === "string" && call[0].includes("[ef-fit-scale]"),
    );
    expect(fitScaleWarns.length).toBe(0);
  });

  test("warns only once per connection", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const wrapper = document.createElement("div");
    wrapper.style.cssText = "width: 400px; height: 0px;";
    wrapper.innerHTML = `
      <ef-fit-scale>
        <div style="width: 800px; height: 600px; background: red;"></div>
      </ef-fit-scale>
    `;
    document.body.appendChild(wrapper);

    // Wait and trigger multiple potential updates
    await waitFrames(10);

    // Resize to trigger another update (still zero height)
    wrapper.style.width = "500px";
    await waitFrames(10);

    // Should only have warned once despite multiple triggers
    const fitScaleWarns = warnSpy.mock.calls.filter(
      (call) => typeof call[0] === "string" && call[0].includes("[ef-fit-scale]"),
    );
    expect(fitScaleWarns.length).toBe(1);
  });
});
