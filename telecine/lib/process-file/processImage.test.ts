import { join } from "node:path";
import { stat, readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { AddressInfo } from "node:net";

import { describe, expect, test } from "vitest";
import { v4 } from "uuid";

import { db } from "@/sql-client.server";
import { processImageFile } from "./processAsset";
import { org, apiKey } from "../../tests/@editframe/api/client";

const fileFixture = async (filename: string) => {
  const path = join(__dirname, `test-files/${filename}`);
  const stats = await stat(path);
  return {
    path,
    stats,
  };
};

const getImageFileById = (id: string) => {
  return db
    .selectFrom("video2.image_files")
    .where("id", "=", id)
    .selectAll()
    .executeTakeFirst();
};

describe("processImageFile", () => {
  test("processes png images", async () => {
    const id = v4();
    const md5 = v4();
    const file = await fileFixture("test.png");
    await processImageFile(file.path, {
      id,
      md5,
      org_id: org.id,
      creator_id: org.primary_user_id,
      api_key_id: apiKey.id,
      filename: "test.png",
      byte_size: file.stats.size,
      next_byte: file.stats.size,
    });

    await expect(getImageFileById(id)).resolves.toMatchObject({
      api_key_id: apiKey.id,
      org_id: org.id,
      creator_id: org.primary_user_id,
      byte_size: 4937,
      next_byte: 4937,
      complete: true,
      filename: "test.png",
      mime_type: "image/png",
      height: 66,
      width: 88,
    });
  });

  test("processes jpg images", async () => {
    const id = v4();
    const md5 = v4();
    const file = await fileFixture("test.jpg");
    await processImageFile(file.path, {
      id,
      md5,
      org_id: org.id,
      creator_id: org.primary_user_id,
      api_key_id: apiKey.id,
      filename: "test.jpg",
      byte_size: file.stats.size,
      next_byte: file.stats.size,
    });

    await expect(getImageFileById(id)).resolves.toMatchObject({
      api_key_id: apiKey.id,
      org_id: org.id,
      creator_id: org.primary_user_id,
      byte_size: 7148,
      next_byte: 7148,
      complete: true,
      filename: "test.jpg",
      mime_type: "image/jpeg",
      height: 66,
      width: 88,
    });
  });

  test("processes jpeg images", async () => {
    const id = v4();
    const md5 = v4();
    const file = await fileFixture("test.jpeg");
    await processImageFile(file.path, {
      id,
      md5,
      org_id: org.id,
      creator_id: org.primary_user_id,
      api_key_id: apiKey.id,
      filename: "test.jpeg",
      byte_size: file.stats.size,
      next_byte: file.stats.size,
    });

    await expect(getImageFileById(id)).resolves.toMatchObject({
      api_key_id: apiKey.id,
      org_id: org.id,
      creator_id: org.primary_user_id,
      byte_size: 7148,
      next_byte: 7148,
      complete: true,
      filename: "test.jpeg",
      mime_type: "image/jpeg",
      height: 66,
      width: 88,
    });
  });

  test("processes gif images", async () => {
    const id = v4();
    const md5 = v4();
    const file = await fileFixture("test.gif");
    await processImageFile(file.path, {
      id,
      md5,
      org_id: org.id,
      creator_id: org.primary_user_id,
      api_key_id: apiKey.id,
      filename: "test.gif",
      byte_size: file.stats.size,
      next_byte: file.stats.size,
    });

    await expect(getImageFileById(id)).resolves.toMatchObject({
      api_key_id: apiKey.id,
      org_id: org.id,
      creator_id: org.primary_user_id,
      byte_size: 6158,
      next_byte: 6158,
      complete: true,
      filename: "test.gif",
      mime_type: "image/gif",
      height: 66,
      width: 88,
    });
  });

  test("processes webp images", async () => {
    const id = v4();
    const md5 = v4();
    const file = await fileFixture("test.webp");
    await processImageFile(file.path, {
      id,
      md5,
      org_id: org.id,
      creator_id: org.primary_user_id,
      api_key_id: apiKey.id,
      filename: "test.webp",
      byte_size: file.stats.size,
      next_byte: file.stats.size,
    });

    await expect(getImageFileById(id)).resolves.toMatchObject({
      api_key_id: apiKey.id,
      org_id: org.id,
      creator_id: org.primary_user_id,
      byte_size: 5106,
      next_byte: 5106,
      complete: true,
      filename: "test.webp",
      mime_type: "image/webp",
      height: 66,
      width: 88,
    });
  });
});

describe("processImageFile via URL", () => {
  test("processes WebP image fetched from HTTP URL", async () => {
    const webpPath = join(__dirname, "test-files/test.webp");
    const webpBytes = await readFile(webpPath);

    const server = createServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "image/webp" });
      res.end(webpBytes);
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as AddressInfo;
    const url = `http://127.0.0.1:${port}/test.webp`;

    try {
      const id = v4();
      const md5 = v4();
      await processImageFile(url, {
        id,
        md5,
        org_id: org.id,
        creator_id: org.primary_user_id,
        api_key_id: apiKey.id,
        filename: url,
        byte_size: webpBytes.length,
        next_byte: webpBytes.length,
      });

      await expect(getImageFileById(id)).resolves.toMatchObject({
        complete: true,
        mime_type: "image/webp",
        height: 66,
        width: 88,
      });
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      );
    }
  });
});
