import { join } from "node:path";
import { readFile } from "node:fs/promises";

import { v4 } from "uuid";
import { describe, test, expect, beforeAll, afterEach, afterAll } from "vitest";
import { http, passthrough } from "msw";
import { setupServer } from "msw/node";

import { createCaptionFile, uploadCaptionFile } from "@editframe/api";
import { webReadableFromBuffers } from "../tests/util/readableFromBuffers";
import { captionsFilePath } from "@/util/filePaths";

import { client, org } from "../tests/@editframe/api/client";

const server = setupServer();

describe("createCaptionFile", () => {
  test("succeeds", async () => {
    const md5 = v4();
    const captionFile = await createCaptionFile(client, {
      md5,
      byte_size: 1024,
      filename: "test.jpg",
    });

    expect(captionFile).toMatchObject({
      md5,
      complete: false,
    });
  });

  test("Yields a new record if created with the same md5", async () => {
    const md5 = v4();
    const captionFile1 = await createCaptionFile(client, {
      md5,
      byte_size: 1024,
      filename: "test.jpg",
    });

    const captionFile2 = await createCaptionFile(client, {
      md5,
      byte_size: 1024,
      filename: "test.jpg",
    });

    expect(captionFile1.id).not.toEqual(captionFile2.id);
  });
});

describe("uploadCaptionFile", () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  test("writes files", async () => {
    const data = "ABCDEFGHI_________0123456789--------||||||||||";
    const buffer = Buffer.from(data);
    const md5 = v4();

    const captionFile = await createCaptionFile(client, {
      md5,
      byte_size: buffer.byteLength,
      filename: "test.mp4",
    });

    const uploadUrl = `http://web:3000/api/v1/caption_files/${captionFile.id}/upload`;

    let requestCount = 0;
    server.use(
      http.all(uploadUrl, () => {
        requestCount++;
        return passthrough();
      }),
    );

    await uploadCaptionFile(
      client,
      captionFile.id,
      webReadableFromBuffers(buffer),
      buffer.byteLength,
    );

    expect(requestCount).toBe(1);
    await expect(
      readFile(
        join(
          "/app",
          "data",
          captionsFilePath({
            org_id: org.id,
            id: captionFile.id,
          }),
        ),
      ),
    ).resolves.toEqual(buffer);
  });
});
