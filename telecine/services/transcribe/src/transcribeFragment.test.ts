import { join } from "node:path";
import { describe, test, expect } from "vitest";
import { v4 as uuid } from "uuid";

import { processISOBMFF } from "@/process-file/processISOBMFF";
import { storageProvider } from "@/util/storageProvider.server";
import { isobmffIndexFilePath } from "@/util/filePaths";
import { org, apiKey } from "TEST/@editframe/api/client";
import { transcribeFragment } from "./transcribeFragment";
import { readIntoBuffer } from "@/util/readIntoBuffer";
import { db } from "@/sql-client.server";
import { TestProgressTracker } from "@/progress-tracking/ProgressTracker";

describe.skip("transcribeFragment", () => {
  test("should transcribe a fragment", async () => {
    const testFile = join(
      __dirname,
      "..",
      "test-transcribe",
      "audio-sample.mp4",
    );

    const id = uuid();
    const md5 = uuid();

    const progressTracker = new TestProgressTracker();

    await processISOBMFF(
      testFile,
      {
        id,
        org_id: org.id,
        md5,
        filename: "audio-sample.mp4",
        creator_id: org.primary_user_id,
        api_key_id: apiKey.id,
        byte_size: 0,
      },
      progressTracker,
    );

    const isobmffFileRecord = await db
      .selectFrom("video2.isobmff_files")
      .where("id", "=", id)
      .where("org_id", "=", org.id)
      .selectAll()
      .executeTakeFirst();

    const trackFragmentIndexStream = await storageProvider.createReadStream(
      isobmffIndexFilePath({
        org_id: org.id,
        id,
      }),
    );

    const trackFragmentIndex = JSON.parse(
      (await readIntoBuffer(trackFragmentIndexStream)).toString(),
    );

    const transcriptions = await Promise.all([
      transcribeFragment(
        {
          work_slice_ms: 5000,
          track_id: 1,
          org_id: org.id,
          file_id: isobmffFileRecord!.id,
        },
        trackFragmentIndex[1],
        0,
      ),
      transcribeFragment(
        {
          work_slice_ms: 5000,
          track_id: 1,
          org_id: org.id,
          file_id: isobmffFileRecord!.id,
        },
        trackFragmentIndex[1],
        1,
      ),
    ]);

    expect(transcriptions).toEqual([
      {
        segments: [
          { end: 2, start: 0.13, text: " Thanks  for  trying  Editframe." },
          {
            end: 3.9,
            start: 2,
            text: " This  is  an  audio  file  we  created  for",
          },
          { end: 5, start: 3.9, text: " our  documentation." },
        ],
        word_segments: [
          { end: 0.5, start: 0.13, text: " Thanks" },
          { end: 0.74, start: 0.5, text: " for" },
          { end: 1.23, start: 0.74, text: " trying" },
          { end: 2, start: 1.23, text: " Editframe." },
          { end: 2.26, start: 2, text: " This" },
          { end: 2.39, start: 2.26, text: " is" },
          { end: 2.52, start: 2.39, text: " an" },
          { end: 2.85, start: 2.52, text: " audio" },
          { end: 3.11, start: 2.85, text: " file" },
          { end: 3.24, start: 3.11, text: " we" },
          { end: 3.73, start: 3.24, text: " created" },
          { end: 3.9, start: 3.73, text: " for" },
          { end: 4.1, start: 3.9, text: " our" },
          { end: 5, start: 4.1, text: " documentation." },
        ],
      },
      {
        segments: [
          { end: 6.32, start: 5.02, text: " Accommodation." },
          { end: 7, start: 6.32, text: " We  hope  you  enjoy  it." },
        ],
        word_segments: [
          { end: 6.32, start: 5.02, text: " Accommodation." },
          { end: 6.4, start: 6.32, text: " We" },
          { end: 6.56, start: 6.4, text: " hope" },
          { end: 6.68, start: 6.56, text: " you" },
          { end: 6.89, start: 6.68, text: " enjoy" },
          { end: 7, start: 6.89, text: " it." },
        ],
      },
    ]);
  }, 60_000);
});
