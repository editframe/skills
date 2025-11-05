import { v4 } from "uuid";
import { test, expect, describe } from "vitest";

import {
  createISOBMFFFile,
  createISOBMFFTrack,
  uploadISOBMFFTrack,
} from "@editframe/api";
import { webReadableFromBuffers } from "TEST/util/readableFromBuffers";
import { client } from "TEST/@editframe/api/client";
import { createTestTrack } from "TEST/util/createTestTrack";

describe("isobmff_tracks", () => {
  test("returns track file when id does not include filename", async () => {
    const md5 = v4();
    const buffer = Buffer.from("test");

    const isoFile = await createISOBMFFFile(client, {
      md5,
      filename: "test.mp4",
    });

    const track = await createISOBMFFTrack(
      client,
      createTestTrack({
        file_id: isoFile.id,
        byte_size: buffer.byteLength,
      }),
    );

    await uploadISOBMFFTrack(
      client,
      track.file_id,
      track.track_id,
      webReadableFromBuffers(buffer),
      buffer.byteLength,
    ).whenUploaded();

    const response = await client.authenticatedFetch(
      `/api/v1/isobmff_tracks/${isoFile.id}/${track.track_id}`,
    );

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe("test");
  });

  test("returns okay if file already uploaded", async () => {
    const md5 = v4();
    const buffer = Buffer.from("test");

    const isoFile = await createISOBMFFFile(client, {
      md5,
      filename: "test.mp4",
    });

    const track = await createISOBMFFTrack(
      client,
      createTestTrack({
        file_id: isoFile.id,
        byte_size: buffer.byteLength,
      }),
    );

    await uploadISOBMFFTrack(
      client,
      track.file_id,
      track.track_id,
      webReadableFromBuffers(buffer),
      buffer.byteLength,
    ).whenUploaded();

    const trackRepeated = await createISOBMFFTrack(
      client,
      createTestTrack({
        file_id: isoFile.id,
        byte_size: buffer.byteLength,
      }),
    );

    expect(trackRepeated.byte_size).toEqual(track.byte_size);

    await expect(
      uploadISOBMFFTrack(
        client,
        track.file_id,
        track.track_id,
        webReadableFromBuffers(buffer),
        buffer.byteLength,
      ).whenUploaded(),
    ).resolves.toStrictEqual([
      { type: "progress", progress: 0 },
      { type: "progress", progress: 1 },
    ]);
  });
});
