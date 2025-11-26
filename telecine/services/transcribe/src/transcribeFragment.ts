import { mkdtemp, rm, unlink } from "node:fs/promises";
import os from "node:os";
import { spawn } from "node:child_process";
import type { Readable } from "node:stream";
import path from "node:path";
import MultiStream from "multistream";
import type { TrackFragmentIndex } from "@editframe/assets";
import { transcribe } from "./transcribe";
import { isobmffTrackFilePath } from "@/util/filePaths";
import { storageProvider } from "@/util/storageProvider.server";

interface TranscribeFragmentOptions {
  work_slice_ms: number;
  org_id: string;
  file_id: string;
  track_id: number;
}

export const transcribeFragment = async (
  { work_slice_ms, org_id, file_id, track_id }: TranscribeFragmentOptions,
  fragmentIndex: TrackFragmentIndex,
  sequenceNumber: number,
) => {
  let tempDir: string | undefined;
  let tempOutputFile: string | undefined;
  try {
    const fromMs = work_slice_ms * sequenceNumber;
    const toMs = work_slice_ms * (sequenceNumber + 1);

    const durationMs = toMs - fromMs;

    const overlappingSegments = fragmentIndex.segments.filter((segment) => {
      const segmentStartMs = 1000 * (segment.cts / fragmentIndex.timescale);
      const segmentEndMs =
        1000 * ((segment.cts + segment.duration) / fragmentIndex.timescale);

      // Check if there's any overlap between the segment and the desired range
      const segmentOverlaps =
        (segmentEndMs <= toMs && segmentEndMs >= fromMs) ||
        (segmentStartMs >= fromMs && segmentStartMs <= toMs) ||
        (segmentStartMs <= fromMs && segmentEndMs >= toMs) ||
        (segmentStartMs >= fromMs && segmentEndMs <= toMs);
      return segmentOverlaps;
    });

    const firstSegment = overlappingSegments[0];
    const lastSegment = overlappingSegments[overlappingSegments.length - 1];
    if (!(firstSegment && lastSegment)) {
      console.log("No overlapping segments", {
        overlappingSegments,
        fromMs,
        toMs,
        index: JSON.stringify(fragmentIndex, null, 2),
      });
      throw new Response("No overlapping segments", { status: 404 });
    }

    tempDir = await mkdtemp(path.join(os.tmpdir(), "transcription-"));
    tempOutputFile = path.join(tempDir, "output.wav");

    console.log("Transcribing segments", firstSegment, lastSegment);
    // Create multistream of segments
    const segmentStream = await createSegmentStreams({
      initBytes: {
        start: fragmentIndex.initSegment.offset,
        end: fragmentIndex.initSegment.size,
      },
      dataBytes: {
        start: firstSegment.offset,
        end: lastSegment.offset + lastSegment.size,
      },
      org_id,
      file_id,
      track_id,
    });

    console.log(
      "Creating temp output file",
      tempOutputFile,
      fromMs,
      durationMs,
    );
    // Process with ffmpeg using stdin
    // biome-ignore format: keep args on same line
    const ffmpegProcess = spawn(
      "ffmpeg",
      [
        "-i",
        "pipe:0",
        "-t",
        `${durationMs}ms`,
        "-codec",
        "pcm_s16le",
        "-ac",
        "1",
        "-ar",
        "16000",
        tempOutputFile,
      ],
      {
        stdio: ["pipe", "inherit", "inherit"],
      },
    );
    segmentStream.pipe(ffmpegProcess.stdin);

    await new Promise((resolve, reject) => {
      ffmpegProcess.on("close", (code) => {
        if (code === 0) resolve(null);
        else reject(new Error(`ffmpeg process exited with code ${code}`));
      });
    });
    console.log("Created temp output file", tempOutputFile);

    return await transcribe(
      tempOutputFile,
      sequenceNumber * (work_slice_ms / 1000),
    );
  } finally {
    // Clean up temporary files
    if (tempOutputFile) {
      unlink(tempOutputFile).catch(console.error);
    }
    if (tempDir) {
      rm(tempDir, { recursive: true, force: true }).catch(console.error);
    }
  }
};

async function createSegmentStreams({
  initBytes,
  dataBytes,
  org_id,
  file_id,
  track_id,
}: {
  initBytes: { start: number; end: number };
  dataBytes: { start: number; end: number };
  org_id: string;
  file_id: string;
  track_id: number;
}): Promise<Readable> {
  const trackFilePath = isobmffTrackFilePath({
    org_id,
    id: file_id,
    track_id: track_id,
  });

  const [initStream, dataStream] = await Promise.all([
    storageProvider.createReadStream(trackFilePath, {
      start: initBytes.start,
      end: initBytes.end - 1,
    }),
    storageProvider.createReadStream(trackFilePath, {
      start: dataBytes.start,
      end: dataBytes.end - 1,
    }),
  ]);

  return new MultiStream([initStream, dataStream]);
}
