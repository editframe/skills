import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";

import { Client } from "../client.js";
import { createURLToken, signingRequestSchema } from "./url-token.js";

const server = setupServer();
const client = new Client("ef_TEST_TOKEN", "http://localhost");

describe("URL Token", () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  describe("signingRequestSchema", () => {
    test("parses url-only payload", () => {
      const result = signingRequestSchema.parse({ url: "http://example.com" });
      expect(result).toEqual({ url: "http://example.com" });
    });

    test("parses url with params", () => {
      const result = signingRequestSchema.parse({
        url: "https://editframe.com/api/v1/transcode",
        params: { url: "https://cdn.example.com/video.mp4" },
      });
      expect(result).toEqual({
        url: "https://editframe.com/api/v1/transcode",
        params: { url: "https://cdn.example.com/video.mp4" },
      });
    });

    test("rejects non-URL strings", () => {
      expect(() => signingRequestSchema.parse({ url: "not-a-url" })).toThrow();
    });
  });

  describe("createURLToken", () => {
    test("Throws when server returns an error", async () => {
      server.use(
        http.post("http://localhost/api/v1/url-token", () =>
          HttpResponse.text("Internal Server Error", { status: 500 }),
        ),
      );

      await expect(
        createURLToken(client, { url: "http://example.com" }),
      ).rejects.toThrowError(
        "Failed to create signed url: 500 Internal Server Error Internal Server Error",
      );
    });

    test("Returns token from the http response", async () => {
      server.use(
        http.post("http://localhost/api/v1/url-token", () =>
          HttpResponse.json({ token: "test-token" }, { status: 200, statusText: "OK" }),
        ),
      );

      await expect(
        createURLToken(client, { url: "http://example.com" }),
      ).resolves.toBe("test-token");
    });

    test("Sends url and params in request body", async () => {
      let capturedBody: unknown;
      server.use(
        http.post("http://localhost/api/v1/url-token", async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({ token: "test-token" }, { status: 200 });
        }),
      );

      await createURLToken(client, {
        url: "https://editframe.com/api/v1/transcode",
        params: { url: "https://cdn.example.com/video.mp4" },
      });

      expect(capturedBody).toEqual({
        url: "https://editframe.com/api/v1/transcode",
        params: { url: "https://cdn.example.com/video.mp4" },
      });
    });

    test("Sends only url when no params provided", async () => {
      let capturedBody: unknown;
      server.use(
        http.post("http://localhost/api/v1/url-token", async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({ token: "test-token" }, { status: 200 });
        }),
      );

      await createURLToken(client, { url: "http://example.com" });

      expect(capturedBody).toEqual({ url: "http://example.com" });
    });
  });
});
