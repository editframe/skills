import { join } from "node:path";
import { readFile } from "node:fs/promises";

import { v4 } from "uuid";
import { describe, test, expect, beforeAll, afterEach, afterAll } from "vitest";
import { http, passthrough } from "msw";
import { setupServer } from "msw/node";

import {
  createISOBMFFFile,
  createISOBMFFTrack,
  uploadISOBMFFTrack,
} from "@editframe/api";
import { webReadableFromBuffers } from "../../util/readableFromBuffers";
import { isobmffTrackFilePath } from "@/util/filePaths";

import { client, org } from "./client";
import { createTestTrack } from "../../util/createTestTrack";

const server = setupServer();

describe("createISOBMFFTrack", () => {
  test("succeeds", async () => {
    const md5 = v4();
    const isoFile = await createISOBMFFFile(client, {
      md5,
      filename: "test.mp4",
    });

    const track = await createISOBMFFTrack(
      client,
      createTestTrack({ file_id: isoFile.id, track_id: 0 }),
    );

    expect(track).toMatchObject({
      byte_size: 5242880,
      file_id: isoFile.id,
      next_byte: 0,
      track_id: 0,
    });
  });

  test("Yields the same record if created with the same md5", async () => {
    const md5 = v4();
    const isoFile = await createISOBMFFFile(client, {
      md5,
      filename: "test.mp4",
    });

    const track1 = await createISOBMFFTrack(
      client,
      createTestTrack({ file_id: isoFile.id, track_id: 0 }),
    );

    const track2 = await createISOBMFFTrack(
      client,
      createTestTrack({ file_id: isoFile.id, track_id: 0 }),
    );

    expect(track1).toEqual(track2);
  });
});

describe("uploadISOBMFFTrack", () => {
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

    const uploadUrl = `http://web:3000/api/v1/isobmff_tracks/${isoFile.id}/0/upload`;

    let requestCount = 0;
    server.use(
      http.all(uploadUrl, () => {
        requestCount++;
        return passthrough();
      }),
    );

    const track = await createISOBMFFTrack(
      client,
      createTestTrack({
        file_id: isoFile.id,
        track_id: 0,
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

    expect(requestCount).toBe(4);
    await expect(
      readFile(
        join(
          "/app",
          "data",
          isobmffTrackFilePath({
            org_id: org.id,
            id: isoFile.id,
            track_id: track.track_id,
          }),
        ),
      ),
    ).resolves.toEqual(buffer);
  });
});
