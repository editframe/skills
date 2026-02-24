import { afterEach, beforeEach, describe, test, vi } from "vitest";
import "./EFImage.js";
import "./EFTimegroup.js";
import type { EFImage } from "./EFImage.js";

/**
 * Verifies that ef-image loads correctly when there is no ef-configuration
 * (no apiHost) and src is a direct path to an image file.
 *
 * Regression: without apiHost, assetPath() routed all non-data: srcs through
 * /api/v1/assets/image?src=... which 404s in a sandbox with no telecine server.
 */
describe("ef-image without apiHost", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    container.style.width = "100px";
    container.style.height = "100px";
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test("loads an absolute src URL without routing through the assets proxy", async ({
    expect,
  }) => {
    const src = `${window.location.origin}/test.webp`;
    const capturedUrls: string[] = [];
    const originalFetch = window.fetch;
    vi.spyOn(window, "fetch").mockImplementation((input, init) => {
      const url = input instanceof Request ? input.url : String(input);
      capturedUrls.push(url);
      return originalFetch.call(window, input, init);
    });

    const image = document.createElement("ef-image") as EFImage;
    image.src = src;
    container.appendChild(image);

    await image.updateComplete;
    await image.loadImage();

    vi.restoreAllMocks();

    const proxyRequests = capturedUrls.filter((url) =>
      url.includes("/api/v1/assets/image"),
    );
    expect(proxyRequests).toHaveLength(0);

    expect(image.contentReadyState).toBe("ready");
  });

  test("loads a relative src path without routing through the assets proxy", async ({
    expect,
  }) => {
    const capturedUrls: string[] = [];
    const originalFetch = window.fetch;
    vi.spyOn(window, "fetch").mockImplementation((input, init) => {
      const url = input instanceof Request ? input.url : String(input);
      capturedUrls.push(url);
      return originalFetch.call(window, input, init);
    });

    const image = document.createElement("ef-image") as EFImage;
    image.src = "/test.webp";
    container.appendChild(image);

    await image.updateComplete;
    await image.loadImage();

    vi.restoreAllMocks();

    const proxyRequests = capturedUrls.filter((url) =>
      url.includes("/api/v1/assets/image"),
    );
    expect(proxyRequests).toHaveLength(0);

    expect(image.contentReadyState).toBe("ready");
  });

  test("reaches ready state for a direct image src", async ({ expect }) => {
    const image = document.createElement("ef-image") as EFImage;
    image.src = `${window.location.origin}/test.webp`;
    container.appendChild(image);

    await image.updateComplete;
    await image.loadImage();

    expect(image.contentReadyState).toBe("ready");
  });
});
