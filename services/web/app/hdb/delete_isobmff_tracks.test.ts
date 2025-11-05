import { expect, test } from "vitest";

import { md5Buffer } from "@editframe/assets";

import { client, org } from "TEST/@editframe/api/client";
import { db } from "@/sql-client.server";
import { storageProvider } from "@/util/storageProvider.server";
import { readIntoBuffer } from "@/util/readIntoBuffer";
import { isobmffIndexFilePath, isobmffTrackFilePath } from "@/util/filePaths";
import { createISOBMFFTrack, uploadISOBMFFTrack } from "@editframe/api";
import { uploadFragmentIndex, createISOBMFFFile } from "@editframe/api";
import { webReadableFromBuffers } from "TEST/util/readableFromBuffers";

function createTestTrack(
  options: Partial<Parameters<typeof createISOBMFFTrack>[1]> = {},
) {
  return Object.assign(
    {
      file_id: "test-id",
      track_id: 1,
      type: "audio",
      probe_info: {
        channels: 2,
        sample_rate: "44100",
        duration: 1000,
        duration_ts: 1000,
        start_time: 0,
        start_pts: 0,
        r_frame_rate: "100",
        channel_layout: "stereo",
        codec_tag_string: "mp3",
        codec_long_name: "MP3",
        codec_type: "audio",
        codec_tag: "0x0000",
        codec_name: "aac",
        bits_per_sample: 16,
        index: 0,
        sample_fmt: "s16",
        time_base: "100",
        avg_frame_rate: "100",
        disposition: {},
        bit_rate: "100",
      },
      duration_ms: 1000,
      codec_name: "mp3",
      byte_size: 1024 * 1024 * 5,
    } as const,
    options,
  );
}

test("Deletes isobmff tracks from storage", async () => {
  const testBuffer = Buffer.from("test", "binary");
  const md5 = md5Buffer(testBuffer);
  const filename = "test.mp4";

  // Create the file in the database.
  // We could in theory have test utilities to do this for us,
  // but the API client is available.
  const createdFile = await createISOBMFFFile(client, {
    md5,
    filename,
  });

  // Then upload data for the file.
  await uploadFragmentIndex(
    client,
    createdFile.id,
    webReadableFromBuffers(testBuffer),
    testBuffer.byteLength,
  );

  const track = await createISOBMFFTrack(
    client,
    createTestTrack({
      file_id: createdFile.id,
      track_id: 0,
      byte_size: testBuffer.byteLength,
    }),
  );

  await uploadISOBMFFTrack(
    client,
    track.file_id,
    track.track_id,
    webReadableFromBuffers(testBuffer),
    testBuffer.byteLength,
  ).whenUploaded();

  const filePath = isobmffIndexFilePath({
    org_id: org.id,
    id: createdFile.id,
  });

  const trackFilePath = isobmffTrackFilePath({
    org_id: org.id,
    id: createdFile.id,
    track_id: track.track_id,
  });

  // Here we verify that the file exists in the storage. This is not a test
  // that the file is correctly uploaded. But we need to verify the file is in place
  // to make the deletion test meaningful.
  await expect(
    readIntoBuffer(await storageProvider.createReadStream(filePath)),
  ).resolves.toEqual(testBuffer);

  // Delete the file from the database.
  await db
    .deleteFrom("video2.isobmff_files")
    .where("id", "=", createdFile.id)
    .execute();

  // Verify that the file is deleted from the storage.
  // Here we poll the storage provider to give hasura time to delete the file.

  await expect
    .poll(() => storageProvider.pathExists(trackFilePath), {
      timeout: 5000,
      interval: 100,
    })
    .toBeFalsy();
});
