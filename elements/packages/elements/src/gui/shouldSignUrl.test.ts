import { describe, expect, it } from "vitest";
import { shouldSignUrl } from "./shouldSignUrl.js";

describe("shouldSignUrl", () => {
  const localOrigin = "http://localhost:5190";
  const remoteOrigin = "https://api.editframe.com";

  it("does not sign local vite plugin endpoints", () => {
    expect(shouldSignUrl("/@ef-sign-url", localOrigin)).toBe(false);
    expect(shouldSignUrl("/@ef-transcode/video.mp4", localOrigin)).toBe(false);
  });

  it("does not sign same-origin transcode URLs", () => {
    const url = `${localOrigin}/api/v1/transcode/audio/init.m4s?url=${encodeURIComponent(`${localOrigin}/assets/walen-headphonk.mp3`)}`;
    expect(shouldSignUrl(url, localOrigin)).toBe(false);
  });

  it("signs cross-origin transcode URLs", () => {
    const url = `${remoteOrigin}/api/v1/transcode/audio/init.m4s?url=${encodeURIComponent("https://storage.editframe.com/audio.mp3")}`;
    expect(shouldSignUrl(url, localOrigin)).toBe(true);
  });

  it("signs cross-origin editframe API URLs", () => {
    expect(shouldSignUrl(`${remoteOrigin}/api/v1/render`, localOrigin)).toBe(
      true,
    );
  });

  it("does not sign relative URLs (same-origin)", () => {
    expect(shouldSignUrl("/api/v1/transcode/video/init.mp4", localOrigin)).toBe(
      false,
    );
  });
});
