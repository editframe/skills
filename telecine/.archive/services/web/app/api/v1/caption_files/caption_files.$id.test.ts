import { v4 } from "uuid";
import { test, expect } from "vitest";

import { createCaptionFile, uploadCaptionFile } from "@editframe/api";
import { webReadableFromBuffers } from "TEST/util/readableFromBuffers";

import { client } from "TEST/@editframe/api/client";

test("returns caption file when id does not include filename", async () => {
  const md5 = v4();
  const buffer = Buffer.from("test");

  const captionFile = await createCaptionFile(client, {
    md5,
    byte_size: buffer.byteLength,
    filename: "test.mp4",
  });

  await uploadCaptionFile(
    client,
    captionFile.id,
    webReadableFromBuffers(buffer),
    buffer.byteLength,
  );

  const response = await client.authenticatedFetch(
    `/api/v1/caption_files/${captionFile.id}`,
  );

  expect(response.status).toBe(200);
  await expect(response.text()).resolves.toBe("test");
});
