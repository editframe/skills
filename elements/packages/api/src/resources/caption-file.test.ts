import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";

import { Client } from "../client.js";
import { webReadableFromBuffers } from "../readableFromBuffers.js";
import {
  createCaptionFile,
  lookupCaptionFileByMd5,
  uploadCaptionFile,
} from "./caption-file.js";

const server = setupServer();
const client = new Client("ef_TEST_TOKEN", "http://localhost");

describe("CaptionFile", () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  describe("createCaptionFile", () => {
    test("Throws when file is too large", async () => {
      await expect(
        createCaptionFile(client, {
          md5: "test-md5",
          filename: "test",
          byte_size: 1024 * 1024 * 3,
        }),
      ).rejects.toThrowError(
        "File size 3145728 bytes exceeds limit 2097152 bytes",
      );
    });

    test("Throws when server returns an error", async () => {
      server.use(
        http.post("http://localhost/api/v1/caption_files", () =>
          HttpResponse.text("Internal Server Error", { status: 500 }),
        ),
      );

      await expect(
        createCaptionFile(client, {
          md5: "test-md5",
          filename: "test",
          byte_size: 4,
        }),
      ).rejects.toThrowError(
        "Failed to create caption 500 Internal Server Error",
      );
    });

    test("Returns json data from the http response", async () => {
      server.use(
        http.post("http://localhost/api/v1/caption_files", () =>
          HttpResponse.json(
            { id: "test-id" },
            { status: 200, statusText: "OK" },
          ),
        ),
      );

      const response = await createCaptionFile(client, {
        md5: "test-md5",
        filename: "test",
        byte_size: 4,
      });

      expect(response).toEqual({ id: "test-id" });
    });
  });

  describe("uploadCaptionFile", () => {
    test("Throws when file is too large", async () => {
      await expect(
        uploadCaptionFile(
          client,
          "test-id",
          webReadableFromBuffers(Buffer.from("test")),
          1024 * 1024 * 3,
        ),
      ).rejects.toThrowError(
        "File size 3145728 bytes exceeds limit 2097152 bytes",
      );
    });

    test("Throws when server returns an error", async () => {
      server.use(
        http.post("http://localhost/api/v1/caption_files/test-id/upload", () =>
          HttpResponse.text("Internal Server Error", { status: 500 }),
        ),
      );

      await expect(
        uploadCaptionFile(
          client,
          "test-id",
          webReadableFromBuffers(Buffer.from("nice")),
          4,
        ),
      ).rejects.toThrowError(
        "Failed to upload caption 500 Internal Server Error",
      );
    });

    test("Returns json data from the http response", async () => {
      server.use(
        http.post("http://localhost/api/v1/caption_files/test-id/upload", () =>
          HttpResponse.json(
            { id: "test-id" },
            { status: 200, statusText: "OK" },
          ),
        ),
      );

      const response = await uploadCaptionFile(
        client,
        "test-id",
        webReadableFromBuffers(Buffer.from("nice")),
        4,
      );

      expect(response).toEqual({ id: "test-id" });
    });
  });

  describe("lookupCaptionFileByMd5", () => {
    test("Returns json data from the http response", async () => {
      server.use(
        http.get("http://localhost/api/v1/caption_files/md5/test-md5", () =>
          HttpResponse.json(
            { id: "test-id", md5: "test-md5", complete: true },
            { status: 200, statusText: "OK" },
          ),
        ),
      );

      const response = await lookupCaptionFileByMd5(client, "test-md5");

      expect(response).toEqual({
        id: "test-id",
        md5: "test-md5",
        complete: true,
      });
    });

    test("Returns null when file is not found", async () => {
      server.use(
        http.get("http://localhost/api/v1/caption_files/md5/test-md5", () =>
          HttpResponse.json({}, { status: 404 }),
        ),
      );

      const response = await lookupCaptionFileByMd5(client, "test-md5");

      expect(response).toBeNull();
    });

    test("Throws when server returns an error", async () => {
      server.use(
        http.get("http://localhost/api/v1/caption_files/md5/test-md5", () =>
          HttpResponse.text("Internal Server Error", { status: 500 }),
        ),
      );

      await expect(
        lookupCaptionFileByMd5(client, "test-md5"),
      ).rejects.toThrowError(
        "Failed to lookup caption by md5 test-md5 500 Internal Server Error",
      );
    });
  });
});
