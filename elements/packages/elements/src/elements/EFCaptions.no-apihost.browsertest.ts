import { afterEach, beforeEach, describe, test, vi } from "vitest";
import "./EFCaptions.js";
import "./EFTimegroup.js";
import type { EFCaptions } from "./EFCaptions.js";

/**
 * Verifies that ef-captions loads correctly when there is no ef-configuration
 * (no apiHost) and captions-src is a direct path to a JSON file.
 *
 * Regression: captionsPath() routed target-based srcs through
 * /api/v1/assets/captions?src=... which 404s without a telecine server.
 * captionsSrc already fetches directly and is unaffected.
 */
describe("ef-captions without apiHost", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test("loads captions from an absolute captions-src URL without a server", async ({
    expect,
  }) => {
    const src = `${window.location.origin}/test-captions-simple.json`;

    const captions = document.createElement("ef-captions") as EFCaptions;
    captions.captionsSrc = src;
    container.appendChild(captions);

    await captions.updateComplete;
    const data = await captions.loadCaptionsData();

    expect(data).toBeTruthy();
    expect(captions.contentReadyState).toBe("ready");
  });

  test("loads captions from a relative captions-src path without a server", async ({
    expect,
  }) => {
    const captions = document.createElement("ef-captions") as EFCaptions;
    captions.captionsSrc = "/test-captions-simple.json";
    container.appendChild(captions);

    await captions.updateComplete;
    const data = await captions.loadCaptionsData();

    expect(data).toBeTruthy();
    expect(captions.contentReadyState).toBe("ready");
  });

  test("does not route captions-src through the assets proxy", async ({
    expect,
  }) => {
    const capturedUrls: string[] = [];
    const originalFetch = window.fetch;
    vi.spyOn(window, "fetch").mockImplementation((input, init) => {
      const url = input instanceof Request ? input.url : String(input);
      capturedUrls.push(url);
      return originalFetch.call(window, input, init);
    });

    const captions = document.createElement("ef-captions") as EFCaptions;
    captions.captionsSrc = "/test-captions-simple.json";
    container.appendChild(captions);

    await captions.updateComplete;
    await captions.loadCaptionsData();

    vi.restoreAllMocks();

    const proxyRequests = capturedUrls.filter((url) =>
      url.includes("/api/v1/assets/captions"),
    );
    expect(proxyRequests).toHaveLength(0);
  });
});
