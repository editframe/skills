import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";

import { Client } from "../client.js";
import { webReadableFromBuffers } from "../readableFromBuffers.js";
import {
  createUnprocessedFile,
  lookupUnprocessedFileByMd5,
  uploadUnprocessedReadableStream,
} from "./unprocessed-file.js";

const server = setupServer();
const client = new Client("ef_TEST_TOKEN", "http://localhost");

const UploadMustContinue = (id = "test-file") =>
  http.get(`http://localhost/api/v1/unprocessed_files/${id}/upload`, () =>
    HttpResponse.json({}, { status: 202 }),
  );

describe("Unprocessed File", () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  describe("createUnprocessedFile", () => {
    test("Throws when file is too large", async () => {
      await expect(
        createUnprocessedFile(client, {
          md5: "test-file",
          filename: "test-file",
          byte_size: 1024 * 1024 * 1025,
        }),
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
        http.post("http://localhost/api/v1/unprocessed_files", () =>
          HttpResponse.text("Internal Server Error", { status: 500 }),
        ),
      );

      await expect(
        createUnprocessedFile(client, {
          md5: "test-file",
          filename: "test-file",
          byte_size: 1024 * 1024,
        }),
      ).rejects.toThrowError("Failed to create unprocessed file 500 Internal Server Error");
    });

    test("Returns json data from the http response", async () => {
      server.use(
        http.post("http://localhost/api/v1/unprocessed_files", () =>
          HttpResponse.json({ testResponse: "test" }, { status: 200, statusText: "OK" }),
        ),
      );

      const result = await createUnprocessedFile(client, {
        md5: "test-file",
        filename: "test-file",
        byte_size: 1024 * 1024,
      });

      expect(result).toEqual({ testResponse: "test" });
    });
  });

  describe("uploadUnprocessedFile", () => {
    test("Throws when server responds with an error", async () => {
      server.use(
        UploadMustContinue(),
        http.post("http://localhost/api/v1/unprocessed_files/test-file/upload", () =>
          HttpResponse.text("Internal Server Error", { status: 500 }),
        ),
      );

      await expect(
        uploadUnprocessedReadableStream(
          client,
          { id: "test-file", byte_size: 4 },
          webReadableFromBuffers(Buffer.from("test")),
        ).whenUploaded(),
      ).rejects.toThrowError(
        "Failed to upload chunk 0 for /api/v1/unprocessed_files/test-file/upload 500 Internal Server Error",
      );
    });

    test("Succeeds when server returns a success", async () => {
      server.use(
        UploadMustContinue(),
        http.post("http://localhost/api/v1/unprocessed_files/test-file/upload", () =>
          HttpResponse.json({}, { status: 201 }),
        ),
      );

      await expect(
        uploadUnprocessedReadableStream(
          client,
          { id: "test-file", byte_size: 4 },
          webReadableFromBuffers(Buffer.from("test")),
        ).whenUploaded(),
      ).resolves.toEqual([
        { type: "progress", progress: 0 },
        { type: "progress", progress: 1 },
      ]);
    });
  });

  describe("lookupUnprocessedFileByMd5", () => {
    test("Returns json data from the http response", async () => {
      server.use(
        http.get("http://localhost/api/v1/unprocessed_files/md5/test-md5", () =>
          HttpResponse.json({ test: "response" }, { status: 200 }),
        ),
      );

      const response = await lookupUnprocessedFileByMd5(client, "test-md5");

      expect(response).toEqual({ test: "response" });
    });

    test("Returns null when file is not found", async () => {
      server.use(
        http.get("http://localhost/api/v1/unprocessed_files/md5/test-md5", () =>
          HttpResponse.json({}, { status: 404 }),
        ),
      );

      const response = await lookupUnprocessedFileByMd5(client, "test-md5");

      expect(response).toBeNull();
    });

    test("Throws when server returns an error", async () => {
      server.use(
        http.get("http://localhost/api/v1/unprocessed_files/md5/test-md5", () =>
          HttpResponse.text("Internal Server Error", { status: 500 }),
        ),
      );

      await expect(lookupUnprocessedFileByMd5(client, "test-md5")).rejects.toThrowError(
        "Failed to lookup unprocessed file by md5 test-md5 500 Internal Server Error",
      );
    });
  });
});
