import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";

import { Client } from "../client.js";
import { webReadableFromBuffers } from "../readableFromBuffers.js";
import { createISOBMFFFile, lookupISOBMFFFileByMd5, uploadFragmentIndex } from "./isobmff-file.js";

const server = setupServer();
const client = new Client("ef_TEST_TOKEN", "http://localhost");

describe("ISOBMFFFile", () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  describe("createISOBMFFFile", () => {
    test("Throws when server returns an error", async () => {
      server.use(
        http.post("http://localhost/api/v1/isobmff_files", () =>
          HttpResponse.text("Internal Server Error", { status: 500 }),
        ),
      );

      await expect(
        createISOBMFFFile(client, {
          md5: "test-md5",
          filename: "test",
        }),
      ).rejects.toThrowError("Failed to create isobmff file 500 Internal Server Error");
    });

    test("Returns json data from the http response", async () => {
      server.use(
        http.post("http://localhost/api/v1/isobmff_files", () =>
          HttpResponse.json({ id: "test-id" }, { status: 200, statusText: "OK" }),
        ),
      );

      const response = await createISOBMFFFile(client, {
        md5: "test-md5",
        filename: "test",
      });

      expect(response).toEqual({ id: "test-id" });
    });
  });

  describe("uploadFragmentIndex", () => {
    test("Throws when file size exceeds limit", async () => {
      await expect(
        uploadFragmentIndex(
          client,
          "test-id",
          webReadableFromBuffers(Buffer.from("test")),
          1024 * 1024 * 3,
        ),
      ).rejects.toThrowError("File size exceeds limit of 2097152 bytes");
    });

    test("Throws when server returns an error", async () => {
      server.use(
        http.post("http://localhost/api/v1/isobmff_files/test-id/index/upload", () =>
          HttpResponse.text("Internal Server Error", { status: 500 }),
        ),
      );

      await expect(
        uploadFragmentIndex(client, "test-id", webReadableFromBuffers(Buffer.from("test")), 4),
      ).rejects.toThrowError("Failed to create fragment index 500 Internal Server Error");
    });

    test("Returns json data from the http response", async () => {
      server.use(
        http.post("http://localhost/api/v1/isobmff_files/test-id/index/upload", () =>
          HttpResponse.json({ fragment_index_complete: true }, { status: 200, statusText: "OK" }),
        ),
      );

      const response = await uploadFragmentIndex(
        client,
        "test-id",
        webReadableFromBuffers(Buffer.from("test")),
        4,
      );

      expect(response).toEqual({ fragment_index_complete: true });
    });
  });

  describe("lookupISOBMFFFileByMd5", () => {
    test("Returns json data from the http response", async () => {
      server.use(
        http.get("http://localhost/api/v1/isobmff_files/md5/test-md5", () =>
          HttpResponse.json(
            { id: "test-id", md5: "test-md5", fragment_index_complete: true },
            { status: 200, statusText: "OK" },
          ),
        ),
      );

      const response = await lookupISOBMFFFileByMd5(client, "test-md5");

      expect(response).toEqual({
        id: "test-id",
        md5: "test-md5",
        fragment_index_complete: true,
      });
    });

    test("Returns null when file is not found", async () => {
      server.use(
        http.get("http://localhost/api/v1/isobmff_files/md5/test-md5", () =>
          HttpResponse.json({}, { status: 404 }),
        ),
      );

      const response = await lookupISOBMFFFileByMd5(client, "test-md5");

      expect(response).toBeNull();
    });

    test("Throws when server returns an error", async () => {
      server.use(
        http.get("http://localhost/api/v1/isobmff_files/md5/test-md5", () =>
          HttpResponse.text("Internal Server Error", { status: 500 }),
        ),
      );

      await expect(lookupISOBMFFFileByMd5(client, "test-md5")).rejects.toThrowError(
        "Failed to lookup isobmff file by md5 test-md5 500 Internal Server Error",
      );
    });
  });
});
