import { html, render } from "lit";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import "../elements/EFTimegroup.js";
import "../elements/EFVideo.js";
import "./EFConfiguration.js";
import "./EFPlay.js";
import "./EFPreview.js";

describe("EFPlay", () => {
  beforeEach(() => {
    while (document.body.children.length) {
      document.body.children[0]?.remove();
    }
  });

  afterEach(() => {
    const elements = document.querySelectorAll("ef-play");
    for (const element of elements) {
      element.remove();
    }
  });

  test("should be defined", () => {
    const element = document.createElement("ef-play");
    expect(element).toBeDefined();
    expect(element.tagName).toBe("EF-PLAY");
  });

  test("should be visible when not playing", async () => {
    const container = document.createElement("div");
    render(
      html`
        <ef-configuration api-host="http://localhost:63315" signing-url="">
          <ef-preview id="test-preview">
            <ef-video src="bars-n-tone.mp4"></ef-video>
            <ef-play>Play Button</ef-play>
          </ef-preview>
        </ef-configuration>
      `,
      container,
    );
    document.body.appendChild(container);

    const play = container.querySelector("ef-play") as any;
    const preview = container.querySelector("ef-preview") as any;
    const video = container.querySelector("ef-video") as any;

    await play.updateComplete;
    await preview.updateComplete;
    await video.updateComplete;

    await video.mediaEngineTask.run();
    await play.updateComplete;

    expect(play.playing).toBe(false);
    expect(getComputedStyle(play).display).not.toBe("none");

    container.remove();
  });

  test("should be hidden when playing", async () => {
    const container = document.createElement("div");
    render(
      html`
        <ef-configuration api-host="http://localhost:63315" signing-url="">
          <ef-preview id="test-preview">
            <ef-video src="bars-n-tone.mp4"></ef-video>
            <ef-play id="play-btn">Play Button</ef-play>
          </ef-preview>
        </ef-configuration>
      `,
      container,
    );
    document.body.appendChild(container);

    const play = container.querySelector("ef-play") as any;
    const preview = container.querySelector("ef-preview") as any;
    const video = container.querySelector("ef-video") as any;

    await play.updateComplete;
    await preview.updateComplete;
    await video.updateComplete;

    await video.mediaEngineTask.run();
    await play.updateComplete;

    expect(getComputedStyle(play).display).not.toBe("none");

    // Manually trigger playing state change to test visibility mechanism
    play.playing = true;
    await play.updateComplete;

    expect(getComputedStyle(play).display).toBe("none");

    container.remove();
  });

  test("should call play() when clicked", async () => {
    const container = document.createElement("div");
    render(
      html`
        <ef-configuration api-host="http://localhost:63315" signing-url="">
          <ef-preview id="test-preview">
            <ef-video src="bars-n-tone.mp4"></ef-video>
            <ef-play>Play Button</ef-play>
          </ef-preview>
        </ef-configuration>
      `,
      container,
    );
    document.body.appendChild(container);

    const play = container.querySelector("ef-play") as any;
    const preview = container.querySelector("ef-preview") as any;
    const video = container.querySelector("ef-video") as any;

    await play.updateComplete;
    await preview.updateComplete;
    await video.updateComplete;

    await video.mediaEngineTask.run();
    await play.updateComplete;

    const playSpy = vi.spyOn(video.playbackController, "play");

    play.click();

    expect(playSpy).toHaveBeenCalledTimes(1);

    playSpy.mockRestore();
    container.remove();
  }, 1000);

  test("should pass through children with default slot", async () => {
    const container = document.createElement("div");
    render(
      html`
        <ef-configuration api-host="http://localhost:63315" signing-url="">
          <ef-preview id="test-preview">
            <ef-video src="bars-n-tone.mp4"></ef-video>
            <ef-play><span id="play-content">▶ Play</span></ef-play>
          </ef-preview>
        </ef-configuration>
      `,
      container,
    );
    document.body.appendChild(container);

    const play = container.querySelector("ef-play") as any;
    const content = container.querySelector("#play-content");

    await play.updateComplete;

    expect(content).toBeDefined();
    expect(content?.textContent).toBe("▶ Play");

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
          <ef-play target="test-preview">Play Button</ef-play>
        </ef-configuration>
      `,
      container,
    );
    document.body.appendChild(container);

    const play = container.querySelector("ef-play") as any;
    const preview = container.querySelector("ef-preview") as any;
    const video = container.querySelector("ef-video") as any;

    await play.updateComplete;
    await preview.updateComplete;
    await video.updateComplete;

    await video.mediaEngineTask.run();
    await play.updateComplete;

    expect(play.efContext).toBe(preview);

    const playSpy = vi.spyOn(video.playbackController, "play");

    play.click();

    expect(playSpy).toHaveBeenCalledTimes(1);

    playSpy.mockRestore();
    container.remove();
  }, 1000);
});
