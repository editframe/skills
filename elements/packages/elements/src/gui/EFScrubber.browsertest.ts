import { afterEach, describe, expect, test, vi } from "vitest";
import "./EFScrubber.js";
import { EFScrubber } from "./EFScrubber.js";
import { html, render as litRender } from "lit";
import "../gui/EFPreview.js";
import "../elements/EFTimegroup.js";

const testElements: HTMLElement[] = [];

afterEach(() => {
  testElements.forEach((el) => {
    if (el.parentNode) {
      el.parentNode.removeChild(el);
    }
  });
  testElements.length = 0;
});

describe("EFScrubber", () => {
  test("renders horizontal scrubber by default", async () => {
    const container = document.createElement("div");
    container.style.width = "200px";
    container.style.height = "20px";
    document.body.appendChild(container);
    testElements.push(container);

    const scrubber = document.createElement("ef-scrubber");
    scrubber.setAttribute("duration-ms", "5000");
    scrubber.setAttribute("current-time-ms", "2500");
    container.appendChild(scrubber);
    testElements.push(scrubber);

    await scrubber.updateComplete;

    const scrubberBar = scrubber.shadowRoot?.querySelector(".scrubber");
    expect(scrubberBar).toBeTruthy();

    const progress = scrubberBar?.querySelector(".progress") as HTMLElement;
    expect(progress).toBeTruthy();
    expect(progress.style.width).toBe("50%");
  });

  test("renders vertical scrubber when orientation is vertical", async () => {
    const container = document.createElement("div");
    container.style.width = "20px";
    container.style.height = "200px";
    container.style.position = "relative";
    document.body.appendChild(container);
    testElements.push(container);

    const scrubber = document.createElement("ef-scrubber");
    scrubber.setAttribute("duration-ms", "5000");
    scrubber.setAttribute("current-time-ms", "2500");
    scrubber.setAttribute("orientation", "vertical");
    scrubber.setAttribute("zoom-scale", "1.0");
    scrubber.setAttribute("container-width", "100");
    container.appendChild(scrubber);
    testElements.push(scrubber);

    await scrubber.updateComplete;

    const scrubberBar = scrubber.shadowRoot?.querySelector(".scrubber");
    expect(scrubberBar).toBeTruthy();

    const playhead = scrubberBar?.querySelector(".playhead") as HTMLElement;
    expect(playhead).toBeTruthy();
    const leftValue = playhead.style.left;
    expect(leftValue).toMatch(/^\d+px$/);
  });

  test("works with EFPreview context", async () => {
    const container = document.createElement("div");
    container.style.width = "200px";
    container.style.height = "20px";
    document.body.appendChild(container);
    testElements.push(container);

    litRender(
      html`
        <ef-preview>
          <ef-timegroup mode="fixed" duration="5s">
            <ef-scrubber></ef-scrubber>
          </ef-timegroup>
        </ef-preview>
      `,
      container,
    );

    const scrubber = container.querySelector("ef-scrubber") as EFScrubber;
    expect(scrubber).toBeTruthy();

    await scrubber.updateComplete;

    const scrubberBar = scrubber.shadowRoot?.querySelector(".scrubber");
    expect(scrubberBar).toBeTruthy();
  });

  test("handles scrubbing interaction", async () => {
    const container = document.createElement("div");
    container.style.width = "200px";
    container.style.height = "20px";
    document.body.appendChild(container);
    testElements.push(container);

    const scrubber = document.createElement("ef-scrubber");
    scrubber.setAttribute("duration-ms", "5000");
    scrubber.setAttribute("current-time-ms", "0");
    container.appendChild(scrubber);
    testElements.push(scrubber);

    await scrubber.updateComplete;

    const scrubberBar = scrubber.shadowRoot?.querySelector(".scrubber") as HTMLElement;
    expect(scrubberBar).toBeTruthy();

    const rect = scrubberBar.getBoundingClientRect();
    const pointerDown = new PointerEvent("pointerdown", {
      clientX: rect.left + rect.width * 0.5,
      clientY: rect.top + rect.height * 0.5,
      pointerId: 1,
      bubbles: true,
    });

    scrubberBar.dispatchEvent(pointerDown);

    await scrubber.updateComplete;

    const progress = scrubberBar.querySelector(".progress") as HTMLElement;
    expect(parseFloat(progress.style.width)).toBeGreaterThan(0);
  });

  test("handles pointerdown on host element (not just shadow .scrubber)", async () => {
    const container = document.createElement("div");
    container.style.width = "200px";
    container.style.height = "48px";
    document.body.appendChild(container);
    testElements.push(container);

    const scrubber = document.createElement("ef-scrubber");
    scrubber.setAttribute("duration-ms", "5000");
    scrubber.setAttribute("current-time-ms", "0");
    scrubber.style.width = "100%";
    scrubber.style.height = "100%";
    container.appendChild(scrubber);
    testElements.push(scrubber);

    await scrubber.updateComplete;

    const scrubberBar = scrubber.shadowRoot?.querySelector(".scrubber") as HTMLElement;
    expect(scrubberBar).toBeTruthy();

    const rect = scrubberBar.getBoundingClientRect();

    let seekFired = false;
    scrubber.addEventListener("seek", () => {
      seekFired = true;
    });

    // Dispatch on the HOST element directly (not on the shadow .scrubber div).
    // This simulates a click that lands within ef-scrubber's bounds but outside
    // the smaller shadow bar (e.g. the 1px top/bottom gap between a 6px host
    // and a 4px shadow bar).
    const pointerDown = new PointerEvent("pointerdown", {
      clientX: rect.left + rect.width * 0.5,
      clientY: rect.top + rect.height * 0.5,
      pointerId: 1,
      bubbles: true,
      composed: true,
    });
    scrubber.dispatchEvent(pointerDown);

    await scrubber.updateComplete;

    expect(seekFired).toBe(true);
  });

  test("supports zoom scale for vertical timeline mode", async () => {
    const container = document.createElement("div");
    container.style.width = "20px";
    container.style.height = "200px";
    container.style.position = "relative";
    document.body.appendChild(container);
    testElements.push(container);

    const scrubber = document.createElement("ef-scrubber");
    scrubber.setAttribute("duration-ms", "5000");
    scrubber.setAttribute("current-time-ms", "2500");
    scrubber.setAttribute("orientation", "vertical");
    scrubber.setAttribute("zoom-scale", "2.0");
    scrubber.setAttribute("container-width", "1000");
    container.appendChild(scrubber);
    testElements.push(scrubber);

    await scrubber.updateComplete;

    const playhead = scrubber.shadowRoot?.querySelector(".playhead") as HTMLElement;
    expect(playhead).toBeTruthy();
    const leftValue = playhead.style.left;
    expect(leftValue).toMatch(/^\d+px$/);
  });

  test("pauses playback on scrub start and resumes on scrub end when playing", async () => {
    const container = document.createElement("div");
    container.style.width = "200px";
    container.style.height = "20px";
    document.body.appendChild(container);
    testElements.push(container);

    const scrubber = document.createElement("ef-scrubber") as EFScrubber;
    scrubber.setAttribute("duration-ms", "5000");
    scrubber.setAttribute("current-time-ms", "1000");
    container.appendChild(scrubber);
    testElements.push(scrubber);

    await scrubber.updateComplete;

    const pauseFn = vi.fn();
    const playFn = vi.fn();
    const mockContext = {
      playing: true,
      currentTimeMs: 1000,
      durationMs: 5000,
      play: playFn,
      pause: pauseFn,
    };

    (scrubber as any).contextFromParent = mockContext;
    (scrubber as any).playing = true;
    await scrubber.updateComplete;

    const scrubberBar = scrubber.shadowRoot!.querySelector(".scrubber") as HTMLElement;
    const rect = scrubberBar.getBoundingClientRect();

    scrubberBar.dispatchEvent(
      new PointerEvent("pointerdown", {
        clientX: rect.left + rect.width * 0.5,
        clientY: rect.top + rect.height * 0.5,
        pointerId: 1,
        bubbles: true,
      }),
    );
    await scrubber.updateComplete;

    expect(pauseFn).toHaveBeenCalledOnce();

    window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 1 }));
    await scrubber.updateComplete;

    expect(playFn).toHaveBeenCalledOnce();
  });

  test("does not pause or resume when scrubbing while paused", async () => {
    const container = document.createElement("div");
    container.style.width = "200px";
    container.style.height = "20px";
    document.body.appendChild(container);
    testElements.push(container);

    const scrubber = document.createElement("ef-scrubber") as EFScrubber;
    scrubber.setAttribute("duration-ms", "5000");
    scrubber.setAttribute("current-time-ms", "1000");
    container.appendChild(scrubber);
    testElements.push(scrubber);

    await scrubber.updateComplete;

    const pauseFn = vi.fn();
    const playFn = vi.fn();
    const mockContext = {
      playing: false,
      currentTimeMs: 1000,
      durationMs: 5000,
      play: playFn,
      pause: pauseFn,
    };

    (scrubber as any).contextFromParent = mockContext;
    (scrubber as any).playing = false;
    await scrubber.updateComplete;

    const scrubberBar = scrubber.shadowRoot!.querySelector(".scrubber") as HTMLElement;
    const rect = scrubberBar.getBoundingClientRect();

    scrubberBar.dispatchEvent(
      new PointerEvent("pointerdown", {
        clientX: rect.left + rect.width * 0.5,
        clientY: rect.top + rect.height * 0.5,
        pointerId: 1,
        bubbles: true,
      }),
    );
    await scrubber.updateComplete;

    expect(pauseFn).not.toHaveBeenCalled();

    window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 1 }));
    await scrubber.updateComplete;

    expect(playFn).not.toHaveBeenCalled();
  });

  test("resumes playback when disconnected mid-scrub", async () => {
    const container = document.createElement("div");
    container.style.width = "200px";
    container.style.height = "20px";
    document.body.appendChild(container);
    testElements.push(container);

    const scrubber = document.createElement("ef-scrubber") as EFScrubber;
    scrubber.setAttribute("duration-ms", "5000");
    scrubber.setAttribute("current-time-ms", "1000");
    container.appendChild(scrubber);
    testElements.push(scrubber);

    await scrubber.updateComplete;

    const pauseFn = vi.fn();
    const playFn = vi.fn();
    const mockContext = {
      playing: true,
      isConnected: true,
      currentTimeMs: 1000,
      durationMs: 5000,
      play: playFn,
      pause: pauseFn,
    };

    (scrubber as any).contextFromParent = mockContext;
    (scrubber as any).playing = true;
    await scrubber.updateComplete;

    const scrubberBar = scrubber.shadowRoot!.querySelector(".scrubber") as HTMLElement;
    const rect = scrubberBar.getBoundingClientRect();

    scrubberBar.dispatchEvent(
      new PointerEvent("pointerdown", {
        clientX: rect.left + rect.width * 0.5,
        clientY: rect.top + rect.height * 0.5,
        pointerId: 1,
        bubbles: true,
      }),
    );
    await scrubber.updateComplete;

    expect(pauseFn).toHaveBeenCalledOnce();

    container.removeChild(scrubber);

    expect(playFn).toHaveBeenCalledOnce();
  });

  test("shows raw scrub preview when scrubbing with zoom", async () => {
    const container = document.createElement("div");
    container.style.width = "20px";
    container.style.height = "200px";
    container.style.position = "relative";
    document.body.appendChild(container);
    testElements.push(container);

    const scrubber = document.createElement("ef-scrubber");
    scrubber.setAttribute("duration-ms", "5000");
    scrubber.setAttribute("current-time-ms", "2500");
    scrubber.setAttribute("orientation", "vertical");
    scrubber.setAttribute("zoom-scale", "2.0");
    scrubber.setAttribute("container-width", "1000");
    scrubber.setAttribute("raw-scrub-time-ms", "2600");
    scrubber.setAttribute("fps", "30");
    container.appendChild(scrubber);
    testElements.push(scrubber);

    await scrubber.updateComplete;

    const rawPreview = scrubber.shadowRoot?.querySelector(".raw-preview");
    expect(rawPreview).toBeTruthy();
  });
});
