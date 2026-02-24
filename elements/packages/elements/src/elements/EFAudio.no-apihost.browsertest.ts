import { afterEach, beforeEach, describe, test, vi } from "vitest";
import "./EFAudio.js";
import "./EFTimegroup.js";
import type { EFAudio } from "./EFAudio.js";

/**
 * Verifies that ef-audio can create a media engine and produce audio
 * when there is no ef-configuration (no apiHost) and the src is an
 * absolute HTTP URL pointing directly to an audio file.
 *
 * Regression test for the bug where EFMedia always tried to hit
 * /api/v1/transcode/manifest.json even when no apiHost was configured,
 * causing silent failure.
 */
describe("ef-audio without apiHost", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test("creates a media engine for a direct audio file URL when no apiHost is set", async ({
    expect,
  }) => {
    const audioSrc = `${window.location.origin}/test_audio.mp4`;

    const timegroup = document.createElement("ef-timegroup");
    timegroup.setAttribute("mode", "contain");
    const audio = document.createElement("ef-audio") as EFAudio;
    audio.src = audioSrc;
    timegroup.appendChild(audio);
    container.appendChild(timegroup);

    await audio.updateComplete;

    const engine = await audio.getMediaEngine();
    expect(engine).toBeTruthy();
    expect(engine?.tracks.audio).toBeTruthy();
  });

  test("makes a direct network request for the audio file (not a manifest request)", async ({
    expect,
  }) => {
    const audioSrc = `${window.location.origin}/test_audio.mp4`;

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
    audio.src = audioSrc;
    timegroup.appendChild(audio);
    container.appendChild(timegroup);

    await audio.updateComplete;
    await audio.getMediaEngine();

    vi.restoreAllMocks();

    // Should NOT have tried to call the transcoding manifest endpoint
    const manifestRequests = capturedUrls.filter((url) =>
      url.includes("/api/v1/transcode/manifest.json"),
    );
    expect(manifestRequests).toHaveLength(0);

    // Should have made a direct request for the audio file
    const directRequests = capturedUrls.filter((url) =>
      url.includes("test_audio.mp4"),
    );
    expect(directRequests.length).toBeGreaterThan(0);
  });

  test("creates a media engine for a relative src path when no apiHost is set", async ({
    expect,
  }) => {
    const timegroup = document.createElement("ef-timegroup");
    timegroup.setAttribute("mode", "contain");
    const audio = document.createElement("ef-audio") as EFAudio;
    audio.src = "/test_audio.mp4";
    timegroup.appendChild(audio);
    container.appendChild(timegroup);

    await audio.updateComplete;

    const engine = await audio.getMediaEngine();
    expect(engine).toBeTruthy();
    expect(engine?.tracks.audio).toBeTruthy();
  });

  test("can fetch audio spanning a time range without a telecine server", async ({
    expect,
  }) => {
    const audioSrc = `${window.location.origin}/test_audio.mp4`;

    const timegroup = document.createElement("ef-timegroup");
    timegroup.setAttribute("mode", "contain");
    const audio = document.createElement("ef-audio") as EFAudio;
    audio.src = audioSrc;
    timegroup.appendChild(audio);
    container.appendChild(timegroup);

    await audio.updateComplete;
    await audio.getMediaEngine();

    const signal = new AbortController().signal;
    const span = await audio.fetchAudioSpanningTime(0, 1000, signal);

    expect(span).toBeTruthy();
    expect(span?.blob).toBeTruthy();
    expect(span?.blob.size).toBeGreaterThan(0);
  });
});
