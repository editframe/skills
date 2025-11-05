import { html, render } from "lit";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import "../elements/EFTimegroup.js";
import "../elements/EFVideo.js";
import "./EFConfiguration.js";
import "./EFPause.js";
import "./EFPreview.js";

describe("EFPause", () => {
  beforeEach(() => {
    while (document.body.children.length) {
      document.body.children[0]?.remove();
    }
  });

  afterEach(() => {
    const elements = document.querySelectorAll("ef-pause");
    for (const element of elements) {
      element.remove();
    }
  });

  test("should be defined", () => {
    const element = document.createElement("ef-pause");
    expect(element).toBeDefined();
    expect(element.tagName).toBe("EF-PAUSE");
  });

  test("should be hidden when not playing", async () => {
    const container = document.createElement("div");
    render(
      html`
        <ef-configuration api-host="http://localhost:63315" signing-url="">
          <ef-preview id="test-preview">
            <ef-video src="bars-n-tone.mp4"></ef-video>
            <ef-pause>Pause Button</ef-pause>
          </ef-preview>
        </ef-configuration>
      `,
      container,
    );
    document.body.appendChild(container);

    const pause = container.querySelector("ef-pause") as any;
    const preview = container.querySelector("ef-preview") as any;
    const video = container.querySelector("ef-video") as any;

    await pause.updateComplete;
    await preview.updateComplete;
    await video.updateComplete;

    await video.mediaEngineTask.run();
    await new Promise((resolve) => setTimeout(resolve, 100));
    await pause.updateComplete;

    expect(pause.playing).toBe(false);
    expect(getComputedStyle(pause).display).toBe("none");

    container.remove();
  });

  test("should be visible when playing", async () => {
    const container = document.createElement("div");
    render(
      html`
        <ef-configuration api-host="http://localhost:63315" signing-url="">
          <ef-preview id="test-preview">
            <ef-video src="bars-n-tone.mp4"></ef-video>
            <ef-pause>Pause Button</ef-pause>
          </ef-preview>
        </ef-configuration>
      `,
      container,
    );
    document.body.appendChild(container);

    const pause = container.querySelector("ef-pause") as any;
    const preview = container.querySelector("ef-preview") as any;
    const video = container.querySelector("ef-video") as any;

    await pause.updateComplete;
    await preview.updateComplete;
    await video.updateComplete;

    await video.mediaEngineTask.run();
    await new Promise((resolve) => setTimeout(resolve, 100));
    await pause.updateComplete;

    expect(getComputedStyle(pause).display).toBe("none");

    // Manually trigger playing state change to test visibility mechanism
    pause.playing = true;
    await pause.updateComplete;

    expect(getComputedStyle(pause).display).not.toBe("none");

    container.remove();
  });

  test("should call pause() when clicked", async () => {
    const container = document.createElement("div");
    render(
      html`
        <ef-configuration api-host="http://localhost:63315" signing-url="">
          <ef-preview id="test-preview">
            <ef-video src="bars-n-tone.mp4"></ef-video>
            <ef-pause>Pause Button</ef-pause>
          </ef-preview>
        </ef-configuration>
      `,
      container,
    );
    document.body.appendChild(container);

    const pause = container.querySelector("ef-pause") as any;
    const preview = container.querySelector("ef-preview") as any;
    const video = container.querySelector("ef-video") as any;

    await pause.updateComplete;
    await preview.updateComplete;
    await video.updateComplete;

    await video.mediaEngineTask.run();
    await new Promise((resolve) => setTimeout(resolve, 100));
    await pause.updateComplete;

    const pauseSpy = vi.spyOn(video.playbackController, "pause");

    pause.click();

    expect(pauseSpy).toHaveBeenCalledTimes(1);

    pauseSpy.mockRestore();
    container.remove();
  }, 1000);

  test("should pass through children with default slot", async () => {
    const container = document.createElement("div");
    render(
      html`
        <ef-configuration api-host="http://localhost:63315" signing-url="">
          <ef-preview id="test-preview">
            <ef-video src="bars-n-tone.mp4"></ef-video>
            <ef-pause><span id="pause-content">⏸ Pause</span></ef-pause>
          </ef-preview>
        </ef-configuration>
      `,
      container,
    );
    document.body.appendChild(container);

    const pause = container.querySelector("ef-pause") as any;
    const content = container.querySelector("#pause-content");

    await pause.updateComplete;

    expect(content).toBeDefined();
    expect(content?.textContent).toBe("⏸ Pause");

    container.remove();
  });

  test("should work with target attribute", async () => {
    const container = document.createElement("div");
    render(
      html`
        <ef-configuration api-host="http://localhost:63315" signing-url="">
          <ef-preview id="test-preview">
            <ef-video src="bars-n-tone.mp4"></ef-video>
          </ef-preview>
          <ef-pause target="test-preview">Pause Button</ef-pause>
        </ef-configuration>
      `,
      container,
    );
    document.body.appendChild(container);

    const pause = container.querySelector("ef-pause") as any;
    const preview = container.querySelector("ef-preview") as any;
    const video = container.querySelector("ef-video") as any;

    await pause.updateComplete;
    await preview.updateComplete;
    await video.updateComplete;

    await video.mediaEngineTask.run();
    await new Promise((resolve) => setTimeout(resolve, 100));
    await pause.updateComplete;

    expect(pause.efContext).toBe(preview);

    const pauseSpy = vi.spyOn(video.playbackController, "pause");

    pause.click();

    expect(pauseSpy).toHaveBeenCalledTimes(1);

    pauseSpy.mockRestore();
    container.remove();
  }, 1000);
});
