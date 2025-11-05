import { expect, test } from "vitest";

import { md5Buffer } from "@editframe/assets";

import { client, org } from "TEST/@editframe/api/client";
import { db } from "@/sql-client.server";
import { dataFilePath } from "@/util/filePaths";
import { storageProvider } from "@/util/storageProvider.server";
import { readIntoBuffer } from "@/util/readIntoBuffer";
import {
  createUnprocessedFile,
  uploadUnprocessedReadableStream,
} from "@editframe/api";
import { webReadableFromBuffers } from "TEST/util/readableFromBuffers";

test("Deletes unprocessed file from storage", async () => {
  const testBuffer = Buffer.from("test");
  const md5 = md5Buffer(testBuffer);

  // Create the file in the database.
  // We could in theory have test utilities to do this for us,
  // but the API client is available.
  const createdFile = await createUnprocessedFile(client, {
    md5,
    byte_size: testBuffer.byteLength,
    filename: "test.jpg",
  });
  // Then upload data for the file.
  await uploadUnprocessedReadableStream(
    client,
    { id: createdFile.id, byte_size: testBuffer.byteLength },
    webReadableFromBuffers(testBuffer),
  ).whenUploaded();

  const filePath = dataFilePath({
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
    .deleteFrom("video2.unprocessed_files")
    .where("id", "=", createdFile.id)
    .execute();

  // Verify that the file is deleted from the storage.
  // Here we poll the storage provider to give hasura time to delete the file.
  await expect
    .poll(() => storageProvider.pathExists(filePath), {
      timeout: process.env.CI ? 10_000 : 5_000,
      interval: 100,
    })
    .toBeFalsy();
});
