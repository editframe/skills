import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";

import { Client } from "../client.js";
import { webReadableFromBuffers } from "../readableFromBuffers.js";
import {
  createRender,
  lookupRenderByMd5,
  OutputConfiguration,
  uploadRender,
} from "./renders.js";

const server = setupServer();
const client = new Client("ef_TEST_TOKEN", "http://localhost");

describe("Renders", () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  describe("createRender", () => {
    test("throws if server returns an error", async () => {
      server.use(
        http.post("http://localhost/api/v1/renders", () =>
          HttpResponse.text("Internal Server Error", { status: 500 }),
        ),
      );

      await expect(
        createRender(client, createTestRender()),
      ).rejects.toThrowError(
        "Failed to create render 500 Internal Server Error",
      );
    });

    test("returns json data from the http response", async () => {
      server.use(
        http.post("http://localhost/api/v1/renders", () =>
          HttpResponse.json(
            { testResponse: "test" },
            { status: 200, statusText: "OK" },
          ),
        ),
      );

      const response = await createRender(client, createTestRender());

      expect(response).toEqual({ testResponse: "test" });
    });
  });

  describe("uploadRender", () => {
    test("throws if server returns an error", async () => {
      server.use(
        http.post("http://localhost/api/v1/renders/test-id/upload", () =>
          HttpResponse.text("Internal Server Error", { status: 500 }),
        ),
      );

      await expect(
        uploadRender(
          client,
          "test-id",
          webReadableFromBuffers(Buffer.from("test")),
        ),
      ).rejects.toThrowError(
        "Failed to upload render 500 Internal Server Error",
      );
    });

    test("returns json data from the http response", async () => {
      server.use(
        http.post("http://localhost/api/v1/renders/test-id/upload", () =>
          HttpResponse.json(
            { testResponse: "test" },
            { status: 200, statusText: "OK" },
          ),
        ),
      );

      const response = await uploadRender(
        client,
        "test-id",
        webReadableFromBuffers(Buffer.from("test")),
      );

      expect(response).toEqual({ testResponse: "test" });
    });
  });

  describe("lookupRenderByMd5", () => {
    test("Returns json data from the http response", async () => {
      server.use(
        http.get("http://localhost/api/v1/renders/md5/test-md5", () =>
          HttpResponse.json(
            { id: "test-id", md5: "test-md5", status: "complete" },
            { status: 200, statusText: "OK" },
          ),
        ),
      );

      const response = await lookupRenderByMd5(client, "test-md5");

      expect(response).toEqual({
        id: "test-id",
        md5: "test-md5",
        status: "complete",
      });
    });

    test("Returns null when file is not found", async () => {
      server.use(
        http.get("http://localhost/api/v1/renders/md5/test-md5", () =>
          HttpResponse.json({}, { status: 404 }),
        ),
      );

      const response = await lookupRenderByMd5(client, "test-md5");

      expect(response).toBeNull();
    });

    test("Throws when server returns an error", async () => {
      server.use(
        http.get("http://localhost/api/v1/renders/md5/test-md5", () =>
          HttpResponse.text("Internal Server Error", { status: 500 }),
        ),
      );

      await expect(lookupRenderByMd5(client, "test-md5")).rejects.toThrowError(
        "Failed to lookup render by md5 test-md5 500 Internal Server Error",
      );
    });
  });
});

describe("OutputConfiguration", () => {
  test("should create a valid output configuration from nullish values", () => {
    const outputConfiguration = OutputConfiguration.parse();
    expect(outputConfiguration.output).toEqual({
      container: "mp4",
      audio: {
        codec: "aac",
      },
      video: {
        codec: "h264",
      },
    });
  });

  test("should permit mp4 configuration", () => {
    const outputConfiguration = OutputConfiguration.parse({
      container: "mp4",
      video: {
        codec: "h264",
      },
      audio: {
        codec: "aac",
      },
    });
    expect(outputConfiguration.isVideo).toBe(true);
  });

  test("should permit png configuration", () => {
    const outputConfiguration = OutputConfiguration.parse({
      container: "png",
      compression: 100,
      transparency: true,
    });
    expect(outputConfiguration.isStill).toBe(true);
  });

  test("should permit webp configuration", () => {
    const outputConfiguration = OutputConfiguration.parse({
      container: "webp",
      quality: 100,
      compression: 6,
      transparency: true,
    });
    expect(outputConfiguration.isStill).toBe(true);
  });

  test("should permit jpeg configuration", () => {
    const outputConfiguration = OutputConfiguration.parse({
      container: "jpeg",
      quality: 100,
    });
    expect(outputConfiguration.isStill).toBe(true);
  });
});

const createTestRender = () =>
  ({
    md5: "test-md5",
    fps: 30,
    width: 1920,
    height: 1080,
    work_slice_ms: 100,
    duration_ms: 1000,
    strategy: "v1",
  }) as const;
