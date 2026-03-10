import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";

import { Client } from "../client.js";
import { webReadableFromBuffers } from "../readableFromBuffers.js";
import {
  CreateImageFilePayload,
  createImageFile,
  lookupImageFileByMd5,
  uploadImageFile,
} from "./image-file.js";

const server = setupServer();
const client = new Client("ef_TEST_TOKEN", "http://localhost");

const UploadMustContinue = (id = "test-file") =>
  http.get(`http://localhost/api/v1/image_files/${id}/upload`, () =>
    HttpResponse.json({}, { status: 202 }),
  );

describe("CreateImageFilePayload", () => {
  test("parses mime type from filename", () => {
    const payload = CreateImageFilePayload.parse({
      byte_size: 100,
      filename: "test.jpg",
    });

    expect(payload.mime_type).toBe("image/jpeg");
  });

  test("rejects unsupported mime types", () => {
    const payload = CreateImageFilePayload.safeParse({
      byte_size: 100,
      filename: "test.txt",
    });

    expect(payload.error?.issues.some((issue) => issue.path.includes("mime_type"))).toBe(true);
  });
});

describe("ImageFile", () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  describe("createImageFile", () => {
    test("Throws when file is too large", async () => {
      await expect(
        createImageFile(client, {
          md5: "test-md5",
          filename: "test",
          byte_size: 1024 * 1024 * 17,
          height: 100,
          width: 100,
          mime_type: "image/jpeg",
        }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(`
        [ZodError: [
          {
            "code": "too_big",
            "maximum": 16777216,
            "type": "number",
            "inclusive": true,
            "exact": false,
            "message": "Number must be less than or equal to 16777216",
            "path": [
              "byte_size"
            ]
          }
        ]]
      `);
    });

    test("Throws when server returns an error", async () => {
      server.use(
        http.post("http://localhost/api/v1/image_files", () =>
          HttpResponse.text("Internal Server Error", { status: 500 }),
        ),
      );

      await expect(
        createImageFile(client, {
          md5: "test-md5",
          filename: "test",
          byte_size: 4,
          height: 100,
          width: 100,
          mime_type: "image/jpeg",
        }),
      ).rejects.toThrowError("Failed to create file 500 Internal Server Error");
    });

    test("Returns json data from the http response", async () => {
      server.use(
        http.post("http://localhost/api/v1/image_files", () =>
          HttpResponse.json({ md5: "test-md5" }, { status: 200, statusText: "OK" }),
        ),
      );

      const response = await createImageFile(client, {
        md5: "test-md5",
        filename: "test",
        byte_size: 4,
        height: 100,
        width: 100,
        mime_type: "image/jpeg",
      });

      expect(response).toEqual({ md5: "test-md5" });
    });
  });

  describe("uploadImageFile", () => {
    test("Throws when file is too large", async () => {
      await expect(
        uploadImageFile(
          client,
          { id: "test-file-id", byte_size: 1024 * 1024 * 17 },
          webReadableFromBuffers(Buffer.from("test")),
        ).whenUploaded(),
      ).rejects.toThrowError("File size 17825792 bytes exceeds limit 16777216 bytes");
    });

    test("Throws if upload fails", async () => {
      server.use(
        UploadMustContinue("test-file-id"),
        http.post("http://localhost/api/v1/image_files/test-file-id/upload", () =>
          HttpResponse.text("Internal Server Error", { status: 500 }),
        ),
      );

      await expect(
        uploadImageFile(
          client,
          { id: "test-file-id", byte_size: 4 },
          webReadableFromBuffers(Buffer.from("test")),
        ).whenUploaded(),
      ).rejects.toThrowError(
        "Failed to upload chunk 0 for /api/v1/image_files/test-file-id/upload 500 Internal Server Error",
      );
    });

    test("Uploads file", async () => {
      server.use(
        UploadMustContinue("test-file-id"),
        http.post("http://localhost/api/v1/image_files/test-file-id/upload", () =>
          HttpResponse.json(null, { status: 201 }),
        ),
      );

      await expect(
        uploadImageFile(
          client,
          { id: "test-file-id", byte_size: 4 },
          webReadableFromBuffers(Buffer.from("test")),
        ).whenUploaded(),
      ).resolves.toEqual([
        { type: "progress", progress: 0 },
        { type: "progress", progress: 1 },
      ]);
    });
  });

  describe("lookupImageFileByMd5", () => {
    test("Returns json data from the http response", async () => {
      server.use(
        http.get("http://localhost/api/v1/image_files/md5/test-md5", () =>
          HttpResponse.json(
            { id: "test-id", md5: "test-md5", complete: true },
            { status: 200, statusText: "OK" },
          ),
        ),
      );

      const response = await lookupImageFileByMd5(client, "test-md5");

      expect(response).toEqual({
        id: "test-id",
        md5: "test-md5",
        complete: true,
      });
    });

    test("Returns null when file is not found", async () => {
      server.use(
        http.get("http://localhost/api/v1/image_files/md5/test-md5", () =>
          HttpResponse.json({}, { status: 404 }),
        ),
      );

      const response = await lookupImageFileByMd5(client, "test-md5");

      expect(response).toBeNull();
    });

    test("Throws when server returns an error", async () => {
      server.use(
        http.get("http://localhost/api/v1/image_files/md5/test-md5", () =>
          HttpResponse.text("Internal Server Error", { status: 500 }),
        ),
      );

      await expect(lookupImageFileByMd5(client, "test-md5")).rejects.toThrowError(
        "Failed to lookup image by md5 test-md5 500 Internal Server Error",
      );
    });
  });
});
