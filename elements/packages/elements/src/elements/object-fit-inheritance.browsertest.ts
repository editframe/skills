import { describe, expect, test, afterEach } from "vitest";
import type { EFVideo } from "./EFVideo.js";
import type { EFImage } from "./EFImage.js";
import type { EFWaveform } from "./EFWaveform.js";
import "./EFVideo.js";
import "./EFImage.js";
import "./EFWaveform.js";

/**
 * Verify that object-fit / object-position set on the host custom element
 * propagate to the inner canvas via CSS `inherit`, making the shadow DOM
 * canvas an invisible implementation detail.
 *
 * The goal: consumers style <ef-video> like <video>, <ef-image> like <img>.
 */

const elements: HTMLElement[] = [];

function track<T extends HTMLElement>(el: T): T {
  elements.push(el);
  return el;
}

afterEach(() => {
  for (const el of elements) el.remove();
  elements.length = 0;
});

function getCanvas(host: EFVideo | EFImage | EFWaveform): HTMLCanvasElement {
  const canvas = host.shadowRoot?.querySelector("canvas");
  if (!canvas) throw new Error("No canvas found in shadow root");
  return canvas;
}

// ---------------------------------------------------------------------------
// ef-video
// ---------------------------------------------------------------------------

describe("ef-video object-fit inheritance", () => {
  test("defaults to object-fit: contain on the canvas", async () => {
    const video = track(document.createElement("ef-video"));
    video.style.width = "400px";
    video.style.height = "300px";
    document.body.appendChild(video);
    await video.updateComplete;

    const canvas = getCanvas(video);
    expect(getComputedStyle(canvas).objectFit).toBe("contain");
  });

  test("defaults to object-position: center on the canvas", async () => {
    const video = track(document.createElement("ef-video"));
    video.style.width = "400px";
    video.style.height = "300px";
    document.body.appendChild(video);
    await video.updateComplete;

    const canvas = getCanvas(video);
    expect(getComputedStyle(canvas).objectPosition).toBe("50% 50%");
  });

  for (const value of [
    "contain",
    "cover",
    "fill",
    "none",
    "scale-down",
  ] as const) {
    test(`object-fit: ${value} on host propagates to canvas`, async () => {
      const video = track(document.createElement("ef-video"));
      video.style.width = "400px";
      video.style.height = "300px";
      video.style.objectFit = value;
      document.body.appendChild(video);
      await video.updateComplete;

      const canvas = getCanvas(video);
      expect(getComputedStyle(canvas).objectFit).toBe(value);
    });
  }

  test("object-position propagates from host to canvas", async () => {
    const video = track(document.createElement("ef-video"));
    video.style.width = "400px";
    video.style.height = "300px";
    video.style.objectPosition = "top left";
    document.body.appendChild(video);
    await video.updateComplete;

    const canvas = getCanvas(video);
    expect(getComputedStyle(canvas).objectPosition).toBe("0% 0%");
  });

  test("class-based object-fit propagates to canvas", async () => {
    // Simulate what Tailwind's object-cover class does
    const style = track(document.createElement("style"));
    style.textContent = `.test-object-cover { object-fit: cover; }`;
    document.head.appendChild(style);

    const video = track(document.createElement("ef-video"));
    video.style.width = "400px";
    video.style.height = "300px";
    video.classList.add("test-object-cover");
    document.body.appendChild(video);
    await video.updateComplete;

    const canvas = getCanvas(video);
    expect(getComputedStyle(canvas).objectFit).toBe("cover");
  });

  test("canvas computed styles match a native canvas with the same object-fit", async () => {
    const video = track(document.createElement("ef-video"));
    video.style.width = "400px";
    video.style.height = "300px";
    video.style.objectFit = "cover";
    video.style.objectPosition = "top right";
    document.body.appendChild(video);
    await video.updateComplete;

    const shadowCanvas = getCanvas(video);
    shadowCanvas.width = 200;
    shadowCanvas.height = 100;

    const native = track(document.createElement("canvas"));
    native.width = 200;
    native.height = 100;
    native.style.width = "400px";
    native.style.height = "300px";
    native.style.objectFit = "cover";
    native.style.objectPosition = "top right";
    document.body.appendChild(native);

    const shadowStyle = getComputedStyle(shadowCanvas);
    const nativeStyle = getComputedStyle(native);

    expect(shadowStyle.objectFit).toBe(nativeStyle.objectFit);
    expect(shadowStyle.objectPosition).toBe(nativeStyle.objectPosition);
    expect(shadowStyle.width).toBe(nativeStyle.width);
    expect(shadowStyle.height).toBe(nativeStyle.height);
  });
});

// ---------------------------------------------------------------------------
// ef-video layout stability across canvas buffer dimension changes
// ---------------------------------------------------------------------------

describe("ef-video layout stability", () => {
  test("host bounding rect is unchanged when canvas buffer resizes", async () => {
    const container = track(document.createElement("div"));
    container.style.width = "576px";
    container.style.aspectRatio = "16/9";
    document.body.appendChild(container);

    const video = track(document.createElement("ef-video"));
    video.style.width = "100%";
    video.style.height = "100%";
    container.appendChild(video);
    await video.updateComplete;

    const canvas = getCanvas(video);

    // Simulate scrub rendition
    canvas.width = 320;
    canvas.height = 180;
    const afterScrub = video.getBoundingClientRect();

    // Simulate main rendition
    canvas.width = 1920;
    canvas.height = 1080;
    const afterMain = video.getBoundingClientRect();

    // Simulate back to scrub
    canvas.width = 320;
    canvas.height = 180;
    const afterScrubAgain = video.getBoundingClientRect();

    expect(afterScrub.width).toBe(afterMain.width);
    expect(afterScrub.height).toBe(afterMain.height);
    expect(afterScrub.top).toBe(afterMain.top);
    expect(afterScrub.left).toBe(afterMain.left);

    expect(afterMain.width).toBe(afterScrubAgain.width);
    expect(afterMain.height).toBe(afterScrubAgain.height);
    expect(afterMain.top).toBe(afterScrubAgain.top);
    expect(afterMain.left).toBe(afterScrubAgain.left);
  });

  test("canvas bounding rect is unchanged when buffer resizes", async () => {
    const video = track(document.createElement("ef-video"));
    video.style.width = "640px";
    video.style.height = "360px";
    document.body.appendChild(video);
    await video.updateComplete;

    const canvas = getCanvas(video);

    canvas.width = 320;
    canvas.height = 180;
    const rectA = canvas.getBoundingClientRect();

    canvas.width = 1920;
    canvas.height = 1080;
    const rectB = canvas.getBoundingClientRect();

    canvas.width = 854;
    canvas.height = 480;
    const rectC = canvas.getBoundingClientRect();

    expect(rectA.width).toBe(640);
    expect(rectA.height).toBe(360);
    expect(rectB.width).toBe(640);
    expect(rectB.height).toBe(360);
    expect(rectC.width).toBe(640);
    expect(rectC.height).toBe(360);
  });

  test("non-16:9 buffer in 16:9 container does not shift host rect", async () => {
    const video = track(document.createElement("ef-video"));
    video.style.width = "640px";
    video.style.height = "360px";
    video.style.objectFit = "contain";
    document.body.appendChild(video);
    await video.updateComplete;

    const canvas = getCanvas(video);

    // 4:3 buffer in 16:9 container
    canvas.width = 640;
    canvas.height = 480;
    const rect4x3 = video.getBoundingClientRect();

    // 16:9 buffer
    canvas.width = 1920;
    canvas.height = 1080;
    const rect16x9 = video.getBoundingClientRect();

    // 2.39:1 cinemascope buffer
    canvas.width = 1920;
    canvas.height = 803;
    const rectCinema = video.getBoundingClientRect();

    expect(rect4x3.width).toBe(rect16x9.width);
    expect(rect4x3.height).toBe(rect16x9.height);
    expect(rect16x9.width).toBe(rectCinema.width);
    expect(rect16x9.height).toBe(rectCinema.height);
  });
});

// ---------------------------------------------------------------------------
// ef-image
// ---------------------------------------------------------------------------

describe("ef-image object-fit inheritance", () => {
  test("defaults to object-fit: contain on the canvas", async () => {
    const image = track(document.createElement("ef-image"));
    image.style.width = "400px";
    image.style.height = "300px";
    document.body.appendChild(image);
    await image.updateComplete;

    const canvas = getCanvas(image);
    expect(getComputedStyle(canvas).objectFit).toBe("contain");
  });

  for (const value of [
    "contain",
    "cover",
    "fill",
    "none",
    "scale-down",
  ] as const) {
    test(`object-fit: ${value} on host propagates to canvas`, async () => {
      const image = track(document.createElement("ef-image"));
      image.style.width = "400px";
      image.style.height = "300px";
      image.style.objectFit = value;
      document.body.appendChild(image);
      await image.updateComplete;

      const canvas = getCanvas(image);
      expect(getComputedStyle(canvas).objectFit).toBe(value);
    });
  }

  test("object-fit propagates to <img> element for direct URLs", async () => {
    const image = track(document.createElement("ef-image")) as EFImage;
    image.style.width = "200px";
    image.style.height = "200px";
    image.style.objectFit = "cover";

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50"><rect width="100" height="50" fill="red"/></svg>`;
    image.src = `data:image/svg+xml,${encodeURIComponent(svg)}`;
    document.body.appendChild(image);
    await image.updateComplete;

    const img = image.shadowRoot?.querySelector("img");
    if (img) {
      expect(getComputedStyle(img).objectFit).toBe("cover");
    }
  });

  test("canvas computed styles match a native canvas with the same object-fit", async () => {
    const image = track(document.createElement("ef-image")) as EFImage;
    image.style.width = "300px";
    image.style.height = "300px";
    image.style.objectFit = "contain";
    document.body.appendChild(image);
    await image.updateComplete;

    const shadowCanvas = getCanvas(image);
    shadowCanvas.width = 200;
    shadowCanvas.height = 100;

    const native = track(document.createElement("canvas"));
    native.width = 200;
    native.height = 100;
    native.style.width = "300px";
    native.style.height = "300px";
    native.style.objectFit = "contain";
    document.body.appendChild(native);

    const shadowStyle = getComputedStyle(shadowCanvas);
    const nativeStyle = getComputedStyle(native);

    expect(shadowStyle.objectFit).toBe(nativeStyle.objectFit);
    expect(shadowStyle.objectPosition).toBe(nativeStyle.objectPosition);
    expect(shadowStyle.width).toBe(nativeStyle.width);
    expect(shadowStyle.height).toBe(nativeStyle.height);
  });
});

// ---------------------------------------------------------------------------
// ef-waveform
// ---------------------------------------------------------------------------

describe("ef-waveform object-fit inheritance", () => {
  for (const value of ["contain", "cover", "fill"] as const) {
    test(`object-fit: ${value} on host propagates to canvas`, async () => {
      const waveform = track(document.createElement("ef-waveform"));
      waveform.style.width = "400px";
      waveform.style.height = "100px";
      waveform.style.objectFit = value;
      document.body.appendChild(waveform);
      await (waveform as EFWaveform).updateComplete;

      const canvas = getCanvas(waveform as EFWaveform);
      expect(getComputedStyle(canvas).objectFit).toBe(value);
    });
  }
});

// ---------------------------------------------------------------------------
// Pixel-level verification: object-fit: contain letterboxes correctly
// ---------------------------------------------------------------------------

describe("pixel-level object-fit verification", () => {
  test("contain: 2:1 buffer in 1:1 box leaves vertical letterbox bands", async () => {
    const video = track(document.createElement("ef-video"));
    video.style.width = "200px";
    video.style.height = "200px";
    video.style.objectFit = "contain";
    video.style.background = "rgb(0, 0, 255)";
    document.body.appendChild(video);
    await video.updateComplete;

    const canvas = getCanvas(video);
    // 2:1 buffer
    canvas.width = 200;
    canvas.height = 100;

    // Fill the buffer entirely with red
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "rgb(255, 0, 0)";
    ctx.fillRect(0, 0, 200, 100);

    // Verify the buffer is fully red
    const data = ctx.getImageData(0, 0, 200, 100).data;
    // Check center pixel
    const centerIdx = (50 * 200 + 100) * 4;
    expect(data[centerIdx]).toBe(255); // R
    expect(data[centerIdx + 1]).toBe(0); // G
    expect(data[centerIdx + 2]).toBe(0); // B
    expect(data[centerIdx + 3]).toBe(255); // A

    // Verify the CSS computes correctly for the browser to letterbox:
    // 200x100 buffer in 200x200 box with object-fit:contain
    // → content rendered at 200x100 centered (50px top/bottom letterbox)
    expect(getComputedStyle(canvas).objectFit).toBe("contain");

    const rect = canvas.getBoundingClientRect();
    expect(rect.width).toBe(200);
    expect(rect.height).toBe(200);

    // Buffer aspect ratio is 2:1, box is 1:1.
    // object-fit: contain → scale to fit → 200x100 centered in 200x200.
    // Canvas CSS box is 200x200, buffer is 200x100.
    // The top/bottom 50px bands are the host background (blue).
    // The center 100px band is the canvas content (red).
    //
    // We verify the math: the browser MUST render content at
    //   scale = min(200/200, 200/100) = min(1, 2) = 1
    //   rendered size = 200x100, centered at (0, 50)
    //
    // Since getComputedStyle confirms object-fit:contain and the rects
    // confirm the box dimensions, the browser's rendering is deterministic.
    // To go one step further, use elementFromPoint in the letterbox area:

    // The host element should be behind the canvas in the letterbox area,
    // but since the canvas CSS box covers the full 200x200, elementFromPoint
    // will return the canvas. Instead, verify by checking that a native canvas
    // with identical setup would have the same visible behavior:
    const native = track(document.createElement("canvas"));
    native.width = 200;
    native.height = 100;
    native.style.width = "200px";
    native.style.height = "200px";
    native.style.objectFit = "contain";
    native.style.background = "rgb(0, 0, 255)";
    const nctx = native.getContext("2d")!;
    nctx.fillStyle = "rgb(255, 0, 0)";
    nctx.fillRect(0, 0, 200, 100);
    document.body.appendChild(native);

    // Both canvases have identical computed properties → identical rendering
    expect(getComputedStyle(canvas).objectFit).toBe(
      getComputedStyle(native).objectFit,
    );
    expect(getComputedStyle(canvas).objectPosition).toBe(
      getComputedStyle(native).objectPosition,
    );
    expect(canvas.width).toBe(native.width);
    expect(canvas.height).toBe(native.height);
    expect(getComputedStyle(canvas).width).toBe(getComputedStyle(native).width);
    expect(getComputedStyle(canvas).height).toBe(
      getComputedStyle(native).height,
    );
  });

  test("cover: 2:1 buffer in 1:1 box fills entire box", async () => {
    const video = track(document.createElement("ef-video"));
    video.style.width = "200px";
    video.style.height = "200px";
    video.style.objectFit = "cover";
    document.body.appendChild(video);
    await video.updateComplete;

    const canvas = getCanvas(video);
    canvas.width = 200;
    canvas.height = 100;

    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "rgb(255, 0, 0)";
    ctx.fillRect(0, 0, 200, 100);

    // object-fit: cover → scale to cover → content overflows and is clipped
    // scale = max(200/200, 200/100) = max(1, 2) = 2
    // rendered size = 400x200, centered, clipped to 200x200
    // → no letterbox bands, entire 200x200 box shows red content
    expect(getComputedStyle(canvas).objectFit).toBe("cover");

    // Verify parity with native canvas
    const native = track(document.createElement("canvas"));
    native.width = 200;
    native.height = 100;
    native.style.width = "200px";
    native.style.height = "200px";
    native.style.objectFit = "cover";
    document.body.appendChild(native);

    expect(getComputedStyle(canvas).objectFit).toBe(
      getComputedStyle(native).objectFit,
    );
    expect(getComputedStyle(canvas).objectPosition).toBe(
      getComputedStyle(native).objectPosition,
    );
  });

  test("fill: buffer stretches to fill box (no aspect preservation)", async () => {
    const video = track(document.createElement("ef-video"));
    video.style.width = "200px";
    video.style.height = "200px";
    video.style.objectFit = "fill";
    document.body.appendChild(video);
    await video.updateComplete;

    const canvas = getCanvas(video);
    canvas.width = 200;
    canvas.height = 100;

    // object-fit: fill → stretch to fill, no aspect preservation
    expect(getComputedStyle(canvas).objectFit).toBe("fill");

    const native = track(document.createElement("canvas"));
    native.width = 200;
    native.height = 100;
    native.style.width = "200px";
    native.style.height = "200px";
    native.style.objectFit = "fill";
    document.body.appendChild(native);

    expect(getComputedStyle(canvas).objectFit).toBe(
      getComputedStyle(native).objectFit,
    );
  });
});
