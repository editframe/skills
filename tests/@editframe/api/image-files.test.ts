import { join } from "node:path";
import { readFile } from "node:fs/promises";

import { v4 } from "uuid";
import { describe, test, expect, beforeAll, afterEach, afterAll } from "vitest";
import { http, passthrough } from "msw";
import { setupServer } from "msw/node";

import { createImageFile, uploadImageFile } from "@editframe/api";
import { webReadableFromBuffers } from "../../util/readableFromBuffers";
import { imageFilePath } from "@/util/filePaths";

import { client, org } from "./client";

const server = setupServer();

describe("createImageFile", () => {
  test("succeeds", async () => {
    const md5 = v4();
    const imageFile = await createImageFile(client, {
      md5,
      byte_size: 1024,
      width: 100,
      height: 100,
      mime_type: "image/jpeg",
      filename: "test.jpg",
    });

    expect(imageFile).toMatchObject({
      md5,
      complete: false,
    });
  });

  test("Yields a new record if created with the same md5", async () => {
    const md5 = v4();
    const imageFile1 = await createImageFile(client, {
      md5,
      byte_size: 1024,
      width: 100,
      height: 100,
      mime_type: "image/jpeg",
      filename: "test.jpg",
    });

    const imageFile2 = await createImageFile(client, {
      md5,
      byte_size: 1024,
      width: 100,
      height: 100,
      mime_type: "image/jpeg",
      filename: "test.jpg",
    });

    expect(imageFile1.id).not.toEqual(imageFile2.id);
  });
});

describe("uploadImageFile", () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  // TODO: Not clear why this test isn't working.
  test.skip("writes files in multiple chunks", async () => {
    const data = "ABCDEFGHI_________0123456789--------||||||||||||";
    const buffer = Buffer.from(data);
    const md5 = v4();

    const imageFile = await createImageFile(client, {
      md5,
      byte_size: buffer.byteLength,
      width: 100,
      height: 100,
      mime_type: "image/jpeg",
      filename: "test.jpg",
    });

    const uploadUrl = `http://web:3000/api/v1/image_files/${imageFile.id}/upload`;

    let requestCount = 0;
    server.use(
      http.all(uploadUrl, () => {
        requestCount++;
        return passthrough();
      }),
    );

    await uploadImageFile(
      client,
      { id: imageFile.id, byte_size: buffer.byteLength },
      webReadableFromBuffers(buffer),
      Math.floor(buffer.byteLength / 4),
    ).whenUploaded();

    expect(requestCount).toBe(4);
    await expect(
      readFile(
        join(
          "/app",
          "data",
          imageFilePath({ org_id: org.id, id: imageFile.id }),
        ),
      ),
    ).resolves.toEqual(buffer);
  });

  test("returns okay if file already uploaded", async () => {
    const md5 = v4();
    const buffer = Buffer.from("test");

    const imageFile = await createImageFile(client, {
      md5,
      byte_size: buffer.byteLength,
      width: 100,
      height: 100,
      mime_type: "image/jpeg",
      filename: "test.jpg",
    });

    await expect(
      uploadImageFile(
        client,
        { id: imageFile.id, byte_size: buffer.byteLength },
        webReadableFromBuffers(buffer),
      ).whenUploaded(),
    ).resolves.toStrictEqual([
      { type: "progress", progress: 0 },
      { type: "progress", progress: 1 },
    ]);

    await expect(
      uploadImageFile(
        client,
        { id: imageFile.id, byte_size: buffer.byteLength },
        webReadableFromBuffers(buffer),
      ).whenUploaded(),
    ).resolves.toStrictEqual([
      { type: "progress", progress: 0 },
      { type: "progress", progress: 1 },
    ]);
  });
});
