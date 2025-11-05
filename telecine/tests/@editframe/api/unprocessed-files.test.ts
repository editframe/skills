import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { v4 } from "uuid";
import { describe, test, expect, beforeAll, afterEach, afterAll } from "vitest";
import { http, passthrough } from "msw";
import { setupServer } from "msw/node";

import {
  createUnprocessedFile,
  uploadUnprocessedReadableStream,
} from "@editframe/api";

import { dataFilePath } from "@/util/filePaths";
import { webReadableFromBuffers } from "../../util/readableFromBuffers";
import { client, org } from "./client";

const server = setupServer();

describe("createUnprocessedFile", () => {
  test("succeeds", async () => {
    const md5 = v4();
    const unprocessedFile = await createUnprocessedFile(client, {
      md5,
      byte_size: 1024,
      filename: "test.jpg",
    });

    expect(unprocessedFile).toMatchObject({
      byte_size: 1024,
      next_byte: 0,
    });
  });
});

describe("uploadUnprocessedFile", () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  test("writes in multiple chunks", async () => {
    const data = "ABCDEFGHI_________0123456789--------||||||||||";
    const buffer = Buffer.from(data);
    const md5 = v4();

    const unprocessedFile = await createUnprocessedFile(client, {
      md5,
      byte_size: buffer.byteLength,
      filename: "test.jpg",
    });

    const uploadUrl = `http://web:3000/api/v1/unprocessed_files/${unprocessedFile.id}/upload`;

    let requestCount = 0;
    server.use(
      http.all(uploadUrl, () => {
        requestCount++;
        return passthrough();
      }),
    );

    const result = await uploadUnprocessedReadableStream(
      client,
      { id: unprocessedFile.id, byte_size: buffer.byteLength },
      webReadableFromBuffers(buffer),
    ).whenUploaded();

    expect(result).toMatchObject({});
    expect(requestCount).toEqual(4);
    await expect(
      readFile(
        join(
          "/app",
          "data",
          dataFilePath({
            org_id: org.id,
            id: unprocessedFile.id,
          }),
        ),
      ),
    ).resolves.toEqual(buffer);
  });

  test("returns okay if file already uploaded", async () => {
    const md5 = v4();
    const buffer = Buffer.from("test");

    const unprocessedFile = await createUnprocessedFile(client, {
      md5,
      byte_size: buffer.byteLength,
      filename: "test.jpg",
    });

    await uploadUnprocessedReadableStream(
      client,
      { id: unprocessedFile.id, byte_size: buffer.byteLength },
      webReadableFromBuffers(buffer),
    ).whenUploaded();

    await expect(
      uploadUnprocessedReadableStream(
        client,
        { id: unprocessedFile.id, byte_size: buffer.byteLength },
        webReadableFromBuffers(buffer),
      ).whenUploaded(),
    ).resolves.toStrictEqual([
      { type: "progress", progress: 0 },
      { type: "progress", progress: 1 },
    ]);
  });
});
