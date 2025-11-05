import { describe, test, expect } from "vitest";
import { validateUrlToken, normalizeUrlForComparison } from "./validateUrlToken";
import type { URLSessionInfo } from "./session";

describe("validateUrlToken", () => {
  const createUrlSession = (url: string, params: Record<string, string> = {}): URLSessionInfo => ({
    type: "url" as const,
    uid: "test-user-id",
    cid: "test-cid",
    oid: "test-oid",
    url,
    params
  });

  test("validates matching URLs with same protocol", () => {
    const session = createUrlSession("https://example.com/video.mp4");
    const result = validateUrlToken(session, "https://example.com/video.mp4");

    expect(result.isValid).toBe(true);
    expect(result.errorDetails).toBeUndefined();
  });

  test("validates matching URLs with different protocols", () => {
    const session = createUrlSession("https://example.com/video.mp4");
    const result = validateUrlToken(session, "http://example.com/video.mp4");

    expect(result.isValid).toBe(true);
    expect(result.errorDetails).toBeUndefined();
  });

  test("validates matching URLs when session has http and request has https", () => {
    const session = createUrlSession("http://example.com/video.mp4");
    const result = validateUrlToken(session, "https://example.com/video.mp4");

    expect(result.isValid).toBe(true);
    expect(result.errorDetails).toBeUndefined();
  });

  test("rejects mismatched URLs", () => {
    const session = createUrlSession("https://example.com/video.mp4");
    const result = validateUrlToken(session, "https://different.com/video.mp4");

    expect(result.isValid).toBe(false);
    expect(result.errorDetails).toBeDefined();
    expect(result.errorDetails!.requestUrl).toBe("https://different.com/video.mp4");
    expect(result.errorDetails!.signedUrl).toBe("https://example.com/video.mp4");
    expect(result.errorDetails!.message).toContain("URL prefix mismatch");
  });

  test("rejects URLs with different paths", () => {
    const session = createUrlSession("https://example.com/video.mp4");
    const result = validateUrlToken(session, "https://example.com/different.mp4");

    expect(result.isValid).toBe(false);
    expect(result.errorDetails).toBeDefined();
  });

  test("rejects URLs with different query parameters", () => {
    const session = createUrlSession("https://example.com/video.mp4", { token: "abc" });
    const result = validateUrlToken(session, "https://example.com/video.mp4?token=xyz");

    expect(result.isValid).toBe(false);
    expect(result.errorDetails).toBeDefined();
    expect(result.errorDetails!.message).toContain("Parameter value mismatch");
  });

  // Prefix matching tests
  test("validates when signed URL is a prefix of request URL", () => {
    const session = createUrlSession("https://example.com/videos/");
    const result = validateUrlToken(session, "https://example.com/videos/movie1.mp4");

    expect(result.isValid).toBe(true);
    expect(result.errorDetails).toBeUndefined();
  });

  test("validates when signed URL is a prefix with different protocols", () => {
    const session = createUrlSession("http://example.com/videos/");
    const result = validateUrlToken(session, "https://example.com/videos/movie1.mp4");

    expect(result.isValid).toBe(true);
    expect(result.errorDetails).toBeUndefined();
  });

  test("validates when signed URL is a path prefix", () => {
    const session = createUrlSession("https://example.com/api/v1/");
    const result = validateUrlToken(session, "https://example.com/api/v1/transcode/manifest.json");

    expect(result.isValid).toBe(true);
    expect(result.errorDetails).toBeUndefined();
  });

  test("rejects when request has query params but signed URL doesn't", () => {
    const session = createUrlSession("https://example.com/videos/");
    const result = validateUrlToken(session, "https://example.com/videos/movie1.mp4?quality=high");

    expect(result.isValid).toBe(false);
    expect(result.errorDetails).toBeDefined();
    expect(result.errorDetails!.message).toContain("Parameter keys mismatch");
  });

  test("rejects when request URL is shorter than signed URL", () => {
    const session = createUrlSession("https://example.com/videos/movie1.mp4");
    const result = validateUrlToken(session, "https://example.com/videos/");

    expect(result.isValid).toBe(false);
    expect(result.errorDetails).toBeDefined();
    expect(result.errorDetails!.message).toContain("URL prefix mismatch");
  });

  test("rejects when signed URL is not a true prefix", () => {
    const session = createUrlSession("https://example.com/photos/");
    const result = validateUrlToken(session, "https://example.com/videos/movie1.mp4");

    expect(result.isValid).toBe(false);
    expect(result.errorDetails).toBeDefined();
  });

  // Parameter matching tests
  test("validates when both URLs have matching parameters", () => {
    const session = createUrlSession("https://example.com/api/v1/transcode", { url: "source.mp4" });
    const result = validateUrlToken(session, "https://example.com/api/v1/transcode/video-1080p/1.mp4?url=source.mp4");

    expect(result.isValid).toBe(true);
    expect(result.errorDetails).toBeUndefined();
  });

  test("validates when both URLs have multiple matching parameters", () => {
    const session = createUrlSession("https://example.com/api", { url: "source.mp4", quality: "hd" });
    const result = validateUrlToken(session, "https://example.com/api/transcode?url=source.mp4&quality=hd");

    expect(result.isValid).toBe(true);
    expect(result.errorDetails).toBeUndefined();
  });

  test("validates when both URLs have no parameters", () => {
    const session = createUrlSession("https://example.com/api/v1/media/123");
    const result = validateUrlToken(session, "https://example.com/api/v1/media/123");

    expect(result.isValid).toBe(true);
    expect(result.errorDetails).toBeUndefined();
  });

  test("rejects when request has extra parameters", () => {
    const session = createUrlSession("https://example.com/api", { url: "source.mp4" });
    const result = validateUrlToken(session, "https://example.com/api/transcode?url=source.mp4&extra=value");

    expect(result.isValid).toBe(false);
    expect(result.errorDetails).toBeDefined();
    expect(result.errorDetails!.message).toContain("Parameter keys mismatch");
  });

  test("rejects when request is missing parameters", () => {
    const session = createUrlSession("https://example.com/api", { url: "source.mp4", quality: "hd" });
    const result = validateUrlToken(session, "https://example.com/api/transcode?url=source.mp4");

    expect(result.isValid).toBe(false);
    expect(result.errorDetails).toBeDefined();
    expect(result.errorDetails!.message).toContain("Parameter keys mismatch");
  });

  test("rejects when parameter values don't match", () => {
    const session = createUrlSession("https://example.com/api", { url: "source.mp4" });
    const result = validateUrlToken(session, "https://example.com/api/transcode?url=different.mp4");

    expect(result.isValid).toBe(false);
    expect(result.errorDetails).toBeDefined();
    expect(result.errorDetails!.message).toContain('Parameter value mismatch for "url"');
  });

  test("handles URL encoding in parameters correctly", () => {
    const session = createUrlSession("https://example.com/api", { url: "source file.mp4" });
    const result = validateUrlToken(session, "https://example.com/api/transcode?url=source%20file.mp4");

    expect(result.isValid).toBe(true);
    expect(result.errorDetails).toBeUndefined();
  });

  test("handles malformed URLs gracefully", () => {
    const session = createUrlSession("https://example.com/api");
    // Use a truly malformed URL that will cause a URL constructor error
    const result = validateUrlToken(session, "http://[::1::1]"); // Invalid IPv6 format

    expect(result.isValid).toBe(false);
    expect(result.errorDetails).toBeDefined();
    expect(result.errorDetails!.message).toContain("URL parsing error");
  });

  test("transcode use case - multiple segments share token", () => {
    const session = createUrlSession("https://editframe.dev/api/v1/transcode", { url: "https://example.com/video.mp4" });

    // All these different segments should validate with the same token
    const requests = [
      "https://editframe.dev/api/v1/transcode/video-1080p/1.mp4?url=https%3A//example.com/video.mp4",
      "https://editframe.dev/api/v1/transcode/video-1080p/2.mp4?url=https%3A//example.com/video.mp4",
      "https://editframe.dev/api/v1/transcode/audio-44100/1.m4a?url=https%3A//example.com/video.mp4"
    ];

    for (const requestUrl of requests) {
      const result = validateUrlToken(session, requestUrl);
      expect(result.isValid).toBe(true);
      expect(result.errorDetails).toBeUndefined();
    }
  });

  test("handles relative URLs by using signed URL's origin", () => {
    // Store signed parameters in decoded form as expected by the system
    const session = createUrlSession("https://editframe.dev/api/v1/transcode", { url: "http://web:3000/bars-n-tone.mp4" });

    // This is the scenario from the error logs - relative URL from Express request.url
    const relativeRequestUrl = "/api/v1/transcode/manifest.json?url=http%3A%2F%2Fweb%3A3000%2Fbars-n-tone.mp4";
    const result = validateUrlToken(session, relativeRequestUrl);

    expect(result.isValid).toBe(true);
    expect(result.errorDetails).toBeUndefined();
  });
});

describe("normalizeUrlForComparison", () => {
  test("removes https protocol", () => {
    const result = normalizeUrlForComparison("https://example.com/video.mp4");
    expect(result).toBe("://example.com/video.mp4");
  });

  test("removes http protocol", () => {
    const result = normalizeUrlForComparison("http://example.com/video.mp4");
    expect(result).toBe("://example.com/video.mp4");
  });

  test("leaves other protocols unchanged", () => {
    const result = normalizeUrlForComparison("ftp://example.com/file.txt");
    expect(result).toBe("ftp://example.com/file.txt");
  });

  test("handles URLs without protocol", () => {
    const result = normalizeUrlForComparison("example.com/video.mp4");
    expect(result).toBe("example.com/video.mp4");
  });
});