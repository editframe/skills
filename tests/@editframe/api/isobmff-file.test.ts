import { join } from "node:path";
import { readFile } from "node:fs/promises";

import { v4 } from "uuid";
import { describe, test, expect, beforeAll, afterEach, afterAll } from "vitest";
import { http, passthrough } from "msw";
import { setupServer } from "msw/node";

import { createISOBMFFFile, uploadFragmentIndex } from "@editframe/api";
import { webReadableFromBuffers } from "../../util/readableFromBuffers";
import { isobmffIndexFilePath } from "@/util/filePaths";

import { client, org } from "./client";

const server = setupServer();

describe("createISOBMFFFile", () => {
  test("succeeds", async () => {
    const md5 = v4();
    const unprocessedFile = await createISOBMFFFile(client, {
      md5,
      filename: "test.jpg",
    });

    expect(unprocessedFile).toMatchObject({
      md5: md5,
    });
  });

  test("Yields a new record if created with the same md5", async () => {
    const md5 = v4();
    const isoFile1 = await createISOBMFFFile(client, {
      md5,
      filename: "test.jpg",
    });

    const isoFile2 = await createISOBMFFFile(client, {
      md5,
      filename: "test.jpg",
    });

    expect(isoFile1.id).not.toEqual(isoFile2.id);
  });
});

describe("uploadFragmentIndex", () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  test("writes files", async () => {
    const data = "ABCDEFGHI_________0123456789--------||||||||||";
    const buffer = Buffer.from(data);
    const md5 = v4();

    const isoFile = await createISOBMFFFile(client, {
      md5,
      filename: "test.mp4",
    });

    const uploadUrl = `http://web:3000/api/v1/isobmff_files/${isoFile.id}/index/upload`;

    let requestCount = 0;
    server.use(
      http.all(uploadUrl, () => {
        requestCount++;
        return passthrough();
      }),
    );

    await uploadFragmentIndex(
      client,
      isoFile.id,
      webReadableFromBuffers(buffer),
      buffer.byteLength,
    );

    expect(requestCount).toBe(1);
    await expect(
      readFile(
        join(
          "/app",
          "data",
          isobmffIndexFilePath({ org_id: org.id, id: isoFile.id }),
        ),
      ),
    ).resolves.toEqual(buffer);
  });
});
