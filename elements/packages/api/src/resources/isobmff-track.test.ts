import { createTestTrack } from "TEST/createTestTrack.js";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import { Client } from "../client.js";
import { webReadableFromBuffers } from "../readableFromBuffers.js";
import { createISOBMFFTrack, uploadISOBMFFTrack } from "./isobmff-track.js";

const server = setupServer();
const client = new Client("ef_TEST_TOKEN", "http://localhost");

const UploadMustContinue = (fileId = "test-file", trackId = 1) =>
  http.get(
    `http://localhost/api/v1/isobmff_tracks/${fileId}/${trackId}/upload`,
    () => HttpResponse.json({}, { status: 202 }),
  );

describe("ISOBMFF Track", () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  describe("createISOBMFFTrack", () => {
    test("Throws when track is too large", async () => {
      await expect(
        createISOBMFFTrack(
          client,
          createTestTrack({ byte_size: 1024 * 1024 * 1025 }),
        ),
      ).rejects.toThrowErrorMatchingInlineSnapshot(`
        [ZodError: [
          {
            "code": "too_big",
            "maximum": 1073741824,
            "type": "number",
            "inclusive": true,
            "exact": false,
            "message": "Number must be less than or equal to 1073741824",
            "path": [
              "byte_size"
            ]
          }
        ]]
      `);
    });

    test("Throws when server returns an error", async () => {
      server.use(
        http.post("http://localhost/api/v1/isobmff_tracks", () =>
          HttpResponse.text("Internal Server Error", { status: 500 }),
        ),
      );

      await expect(
        createISOBMFFTrack(client, createTestTrack()),
      ).rejects.toThrowError(
        "Failed to create isobmff track 500 Internal Server Error",
      );
    });

    test("Returns json data from the http response", async () => {
      server.use(
        http.post("http://localhost/api/v1/isobmff_tracks", () =>
          HttpResponse.json(
            { testResponse: "test" },
            { status: 200, statusText: "OK" },
          ),
        ),
      );

      const response = await createISOBMFFTrack(
        client,
        createTestTrack({ byte_size: 1024 * 1024 * 5 }),
      );

      expect(response).toEqual({ testResponse: "test" });
    });
  });

  describe("uploadISOBMFFTrack", () => {
    test("Throws when server returns an error", async () => {
      server.use(
        UploadMustContinue("test-file", 1),
        http.post(
          "http://localhost/api/v1/isobmff_tracks/test-file/1/upload",
          () => HttpResponse.text("Internal Server Error", { status: 500 }),
        ),
      );

      await expect(
        uploadISOBMFFTrack(
          client,
          "test-file",
          1,
          webReadableFromBuffers(Buffer.from("test")),
          4,
        ).whenUploaded(),
      ).rejects.toThrowError(
        "Failed to upload chunk 0 for /api/v1/isobmff_tracks/test-file/1/upload 500 Internal Server Error",
      );
    });

    test("Succeeds when server returns a success", async () => {
      server.use(
        UploadMustContinue("test-file", 1),
        http.post(
          "http://localhost/api/v1/isobmff_tracks/test-file/1/upload",
          () => HttpResponse.json({}, { status: 201 }),
        ),
      );

      await expect(
        uploadISOBMFFTrack(
          client,
          "test-file",
          1,
          webReadableFromBuffers(Buffer.from("test")),
          4,
        ).whenUploaded(),
      ).resolves.toEqual([
        { type: "progress", progress: 0 },
        { type: "progress", progress: 1 },
      ]);
    });
  });
});
