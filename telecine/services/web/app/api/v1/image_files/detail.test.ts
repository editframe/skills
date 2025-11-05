import { v4 } from "uuid";
import { test, expect } from "vitest";

import { createImageFile, uploadImageFile } from "@editframe/api";
import { webReadableFromBuffers } from "TEST/util/readableFromBuffers";

import { client } from "TEST/@editframe/api/client";

test("returns image file when id does not include filename", async () => {
  const md5 = v4();
  const buffer = Buffer.from("TEST_IMAGE");

  const imageFile = await createImageFile(client, {
    md5,
    byte_size: buffer.byteLength,
    width: 100,
    height: 100,
    mime_type: "image/jpeg",
    filename: "test.jpg",
  });

  await uploadImageFile(
    client,
    { id: imageFile.id, byte_size: buffer.byteLength },
    webReadableFromBuffers(buffer),
  ).whenUploaded();

  const response = await client.authenticatedFetch(
    `/api/v1/image_files/${imageFile.id}`,
  );
  const body = await response.text();

  expect(response.status).toBe(200);
  expect(body).toBe("TEST_IMAGE");
});
