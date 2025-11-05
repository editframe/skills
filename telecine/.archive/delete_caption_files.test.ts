import { expect, test } from "vitest";

import { createCaptionFile, uploadCaptionFile } from "@editframe/api";
import { md5Buffer } from "@editframe/assets";

import { client, org } from "TEST/@editframe/api/client";
import { db } from "@/sql-client.server";
import { captionsFilePath } from "@/util/filePaths";
import { storageProvider } from "@/util/storageProvider.server";
import { readIntoBuffer } from "@/util/readIntoBuffer";
import { webReadableFromBuffers } from "TEST/util/readableFromBuffers";

test.only("Deletes caption file from storage", async () => {
  const testBuffer = Buffer.from("test");
  const md5 = md5Buffer(testBuffer);
  const filename = "test.json";

  // Create the file in the database.
  // We could in theory have test utilities to do this for us,
  // but the API client is available.
  const createdFile = await createCaptionFile(client, {
    md5,
    filename,
    byte_size: testBuffer.length,
  });

  // Then upload data for the file.
  await uploadCaptionFile(
    client,
    createdFile.id,
    webReadableFromBuffers(testBuffer),
    testBuffer.length,
  );

  const filePath = captionsFilePath({
    org_id: org.id,
    id: createdFile.id,
  });

  // Here we verify that the file exists in the storage. This is not a test
  // that the file is correctly uploaded. But we need to verify the file is in place
  // to make the deletion test meaningful.
  await expect(
    readIntoBuffer(await storageProvider.createReadStream(filePath)),
  ).resolves.toEqual(testBuffer);

  // Delete the file from the database.
  await db
    .deleteFrom("video2.caption_files")
    .where("id", "=", createdFile.id)
    .execute();

  await expect
    .poll(() => storageProvider.pathExists(filePath), {
      timeout: process.env.CI ? 10_000 : 5_000,
      interval: 100,
    })
    .toBeFalsy();
});
