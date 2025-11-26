import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { action } from "./ef-sign-url";

// Mock the anonymous token creation
vi.mock("@/util/createAnonymousURLToken", () => ({
  createAnonymousURLToken: vi.fn(() => "mock-token"),
}));

// Mock environment variable
const originalEnv = process.env;
beforeEach(() => {
  vi.clearAllMocks();
  process.env = {
    ...originalEnv,
    WEB_HOST: "https://example.com",
  };
});

afterEach(() => {
  process.env = originalEnv;
});

describe("ef-sign-url", () => {
  describe("URL pattern validation", () => {
    test("allows URLs starting with WEB_HOST/api/v1/transcode", async () => {
      const transcodeUrls = [
        "https://example.com/api/v1/transcode/manifest",
        "https://example.com/api/v1/transcode/high/1.m4s",
        "https://example.com/api/v1/transcode/audio",
      ];

      for (const url of transcodeUrls) {
        const request = new Request("http://localhost/ef-sign-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url,
            params: { someParam: "value" },
          }),
        });

        const result = await action({ request } as any);
        expect(result.token).toBe("mock-token");
      }
    });

    test("rejects URLs not starting with WEB_HOST/api/v1/transcode", async () => {
      const nonTranscodeUrls = [
        "https://malicious.com/api/v1/transcode/manifest",
        "https://example.com/api/v1/renders/video.mp4",
        "https://example.com/api/v1/uploads",
        "https://example.com/api/v2/transcode/manifest",
        "https://example.com/api/transcode/manifest",
      ];

      for (const url of nonTranscodeUrls) {
        const request = new Request("http://localhost/ef-sign-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url,
            params: {},
          }),
        });

        await expect(action({ request } as any)).rejects.toThrow();
      }
    });
  });

  describe("parameter handling", () => {
    test("accepts any parameters for transcoding endpoints", async () => {
      const request = new Request("http://localhost/ef-sign-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: "https://example.com/api/v1/transcode/manifest",
          params: {
            url: "https://example.com/video.mp4",
            customParam: "allowed",
            anotherParam: "also-allowed",
          },
        }),
      });

      const result = await action({ request } as any);
      expect(result.token).toBe("mock-token");
    });

    test("works with empty parameters", async () => {
      const request = new Request("http://localhost/ef-sign-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: "https://example.com/api/v1/transcode/manifest",
          params: {},
        }),
      });

      const result = await action({ request } as any);
      expect(result.token).toBe("mock-token");
    });
  });

  describe("response format", () => {
    test("returns only the token", async () => {
      const url = "https://example.com/api/v1/transcode/manifest";
      const params = { url: "https://example.com/video.mp4" };

      const request = new Request("http://localhost/ef-sign-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, params }),
      });

      const result = await action({ request } as any);

      expect(result).toEqual({
        token: "mock-token",
      });
    });
  });
});
