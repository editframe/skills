import { describe, test, vi } from "vitest";
import "./EFAudio.js";
import "./EFImage.js";
import "./EFTimegroup.js";
import "../gui/EFWorkbench.js";
import type { EFAudio } from "./EFAudio.js";
import type { EFImage } from "./EFImage.js";

/**
 * Verifies that elements without an ef-configuration ancestor default
 * apiHost to window.location.origin, so all API requests go to the same
 * origin and are handled by the vite plugin middleware (in dev) or
 * telecine (in prod) — with no special casing per element type.
 */
describe("EFSourceMixin apiHost default", () => {
  test("apiHost defaults to window.location.origin when no ef-configuration is present", ({
    expect,
  }) => {
    const audio = document.createElement("ef-audio") as EFAudio;
    document.body.appendChild(audio);
    expect(audio.apiHost).toBe(window.location.origin);
    audio.remove();
  });

  test("apiHost defaults to window.location.origin when inside ef-workbench with no ef-configuration", ({
    expect,
  }) => {
    // ef-workbench.apiHost returns "" (empty string) when no ef-configuration is present.
    // EFSourceMixin must use || (not ??) so that the empty string falls through to window.location.origin.
    const workbench = document.createElement("ef-workbench");
    const audio = document.createElement("ef-audio") as EFAudio;
    workbench.appendChild(audio);
    document.body.appendChild(workbench);
    expect(audio.apiHost).toBe(window.location.origin);
    workbench.remove();
  });

  test("ef-audio routes through /api/v1/transcode/manifest.json when no ef-configuration is present", async ({
    expect,
  }) => {
    const capturedUrls: string[] = [];
    const originalFetch = window.fetch;
    vi.spyOn(window, "fetch").mockImplementation((input, init) => {
      const url = input instanceof Request ? input.url : String(input);
      capturedUrls.push(url);
      return originalFetch.call(window, input, init);
    });

    const timegroup = document.createElement("ef-timegroup");
    timegroup.setAttribute("mode", "contain");
    const audio = document.createElement("ef-audio") as EFAudio;
    audio.src = `${window.location.origin}/test_audio.mp4`;
    timegroup.appendChild(audio);
    document.body.appendChild(timegroup);

    await audio.updateComplete;
    await audio.getMediaEngine().catch(() => {});

    vi.restoreAllMocks();
    timegroup.remove();

    const manifestRequests = capturedUrls.filter((url) =>
      url.includes("/api/v1/transcode/manifest.json"),
    );
    expect(manifestRequests.length).toBeGreaterThan(0);
  });

  test("ef-image routes through /api/v1/assets/image when no ef-configuration is present", ({
    expect,
  }) => {
    const image = document.createElement("ef-image") as EFImage;
    image.src = "/test.webp";
    document.body.appendChild(image);

    const path = image.assetPath();
    expect(path).toContain("/api/v1/assets/image");

    image.remove();
  });
});
