import { v4 } from "uuid";
import { test, expect } from "vitest";

import { createISOBMFFFile, uploadFragmentIndex } from "@editframe/api";
import { webReadableFromBuffers } from "TEST/util/readableFromBuffers";

import { client } from "TEST/@editframe/api/client";

test("returns index file when id does not include filename", async () => {
  const md5 = v4();
  const buffer = Buffer.from("test");

  const isoFile = await createISOBMFFFile(client, {
    md5,
    filename: "test.mp4",
  });

  await uploadFragmentIndex(
    client,
    isoFile.id,
    webReadableFromBuffers(buffer),
    buffer.byteLength,
  );

  const response = await client.authenticatedFetch(
    `/api/v1/isobmff_files/${isoFile.id}/index`,
  );
  await expect(response.text()).resolves.toEqual(buffer.toString());
});
