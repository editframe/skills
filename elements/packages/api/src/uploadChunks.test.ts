import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import { Client } from "./client.js";
import { webReadableFromBuffers } from "./readableFromBuffers.js";
import { fakeCompleteUpload, uploadChunks } from "./uploadChunks.js";

const server = setupServer();

const mockGetUpload = ({
  url = "http://example.org/upload",
  status = 202,
}: {
  url?: string;
  status?: number;
}) => http.get(url, () => HttpResponse.json(null, { status }), { once: true });

const mockPostUpload = ({
  url = "http://example.org/upload",
  status = 202,
}: {
  url?: string;
  status?: number;
}) => http.post(url, () => HttpResponse.json(null, { status }), { once: true });

describe("uploadChunks", () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  test("can be awaited", async () => {
    server.use(
      mockGetUpload({ status: 202 }),
      mockPostUpload({ status: 202 }),
      mockPostUpload({ status: 201 }),
    );

    const client = new Client("ef_TEST_TOKEN");

    const fileStream = webReadableFromBuffers(Buffer.from("hello"));

    const uploader = uploadChunks(client, {
      url: "http://example.org/upload",
      fileStream,
      fileSize: 5,
      chunkSizeBytes: 3,
      maxSize: Number.POSITIVE_INFINITY,
    });

    await expect(uploader.whenUploaded()).resolves.toEqual([
      {
        type: "progress",
        progress: 0,
      },
      {
        type: "progress",
        progress: 0.6,
      },
      {
        type: "progress",
        progress: 1,
      },
    ]);
  });

  test("can be iterated", async () => {
    server.use(
      mockGetUpload({ status: 202 }),
      mockPostUpload({ status: 202 }),
      mockPostUpload({ status: 201 }),
    );

    const client = new Client("ef_TEST_TOKEN");

    const fileStream = webReadableFromBuffers(Buffer.from("hello"));

    const uploader = uploadChunks(client, {
      url: "http://example.org/upload",
      fileStream,
      fileSize: 5,
      chunkSizeBytes: 3,
      maxSize: Number.POSITIVE_INFINITY,
    });

    const events = [];
    // Await the completion of the async iterator
    for await (const event of uploader) {
      events.push(event);
    }

    expect(events).toEqual([
      {
        type: "progress",
        progress: 0,
      },
      {
        type: "progress",
        progress: 0.6,
      },
      {
        type: "progress",
        progress: 1,
      },
    ]);
  });

  test("throws error if chunk upload fails", async () => {
    server.use(
      mockGetUpload({ status: 202 }),
      mockPostUpload({ status: 202 }),
      mockPostUpload({ status: 500 }),
    );

    const client = new Client("ef_TEST_TOKEN");

    const fileStream = webReadableFromBuffers(Buffer.from("hello"));

    await expect(async () => {
      for await (const _ of uploadChunks(client, {
        url: "http://example.org/upload",
        fileStream,
        fileSize: 5,
        chunkSizeBytes: 3,
        maxSize: Number.POSITIVE_INFINITY,
      })) {
      }
    }).rejects.toThrowError(
      "Failed to upload chunk 1 for http://example.org/upload 500 Internal Server Error",
    );
  });

  test("Emits progress events as iterable", async () => {
    const client = new Client("ef_TEST_TOKEN");

    const fileStream = webReadableFromBuffers(Buffer.from("hello"));

    const progressEvents = [];

    server.use(
      mockGetUpload({ status: 202 }),
      mockPostUpload({ status: 202 }),
      mockPostUpload({ status: 201 }),
    );

    for await (const event of uploadChunks(client, {
      url: "http://example.org/upload",
      fileStream,
      fileSize: 5,
      chunkSizeBytes: 3,
      maxSize: Number.POSITIVE_INFINITY,
    })) {
      progressEvents.push(event);
    }

    expect(progressEvents).toEqual([
      {
        type: "progress",
        progress: 0,
      },
      {
        type: "progress",
        progress: 0.6,
      },
      {
        type: "progress",
        progress: 1,
      },
    ]);
  });
});

describe("fakeCompleteUpload", () => {
  test("can be awaited", async () => {
    const uploader = fakeCompleteUpload();
    await expect(uploader.whenUploaded()).resolves.toEqual([
      { type: "progress", progress: 1 },
    ]);
  });

  test("can be iterated", async () => {
    const uploader = fakeCompleteUpload();
    const events = [];
    for await (const event of uploader) {
      events.push(event);
    }
    expect(events).toEqual([{ type: "progress", progress: 1 }]);
  });
});
