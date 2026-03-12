import { describe, test, expect } from "vitest";
import { getMimeTypeFromPath } from "./getMimeTypeFromPath.js";

describe("getMimeTypeFromPath", () => {
  test("detects video MIME types", () => {
    expect(getMimeTypeFromPath("video.mp4")).toBe("video/mp4");
    expect(getMimeTypeFromPath("video.webm")).toBe("video/webm");
    expect(getMimeTypeFromPath("video.m4v")).toBe("video/mp4");
    expect(getMimeTypeFromPath("video.mov")).toBe("video/quicktime");
    expect(getMimeTypeFromPath("track-1.m4s")).toBe("video/iso.segment");
  });

  test("detects audio MIME types", () => {
    expect(getMimeTypeFromPath("audio.mp3")).toBe("audio/mpeg");
    expect(getMimeTypeFromPath("audio.m4a")).toBe("audio/mp4");
    expect(getMimeTypeFromPath("audio.aac")).toBe("audio/aac");
    expect(getMimeTypeFromPath("audio.ogg")).toBe("audio/ogg");
    expect(getMimeTypeFromPath("audio.wav")).toBe("audio/wav");
  });

  test("detects image MIME types", () => {
    expect(getMimeTypeFromPath("image.jpg")).toBe("image/jpeg");
    expect(getMimeTypeFromPath("image.jpeg")).toBe("image/jpeg");
    expect(getMimeTypeFromPath("image.png")).toBe("image/png");
    expect(getMimeTypeFromPath("image.gif")).toBe("image/gif");
    expect(getMimeTypeFromPath("image.webp")).toBe("image/webp");
    expect(getMimeTypeFromPath("image.svg")).toBe("image/svg+xml");
  });

  test("handles paths with query parameters", () => {
    expect(getMimeTypeFromPath("video.mp4?param=value")).toBe("video/mp4");
    expect(getMimeTypeFromPath("audio.mp3?t=123")).toBe("audio/mpeg");
    expect(getMimeTypeFromPath("image.jpg?width=100&height=100")).toBe("image/jpeg");
  });

  test("handles full file paths", () => {
    expect(getMimeTypeFromPath("video2/org123/id456/track-1.mp4")).toBe("video/mp4");
    expect(getMimeTypeFromPath("/absolute/path/to/file.webm")).toBe("video/webm");
    expect(getMimeTypeFromPath("relative/path/image.png")).toBe("image/png");
  });

  test("handles paths without extensions", () => {
    expect(getMimeTypeFromPath("file")).toBeNull();
    expect(getMimeTypeFromPath("path/to/file")).toBeNull();
    expect(getMimeTypeFromPath("data")).toBeNull();
  });

  test("handles unknown extensions", () => {
    expect(getMimeTypeFromPath("file.xyz")).toBeNull();
    expect(getMimeTypeFromPath("file.unknown")).toBeNull();
  });

  test("is case insensitive", () => {
    expect(getMimeTypeFromPath("video.MP4")).toBe("video/mp4");
    expect(getMimeTypeFromPath("VIDEO.MP4")).toBe("video/mp4");
    expect(getMimeTypeFromPath("video.Mp4")).toBe("video/mp4");
  });

  test("handles JSON files", () => {
    expect(getMimeTypeFromPath("data.json")).toBe("application/json");
    expect(getMimeTypeFromPath("tracks.json")).toBe("application/json");
    expect(getMimeTypeFromPath("captions.json")).toBe("application/json");
  });
});
