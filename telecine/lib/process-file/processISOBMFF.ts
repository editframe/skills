import { PassThrough, type Writable } from "node:stream";
import { pipeline } from "node:stream/promises";

import { Probe, generateFragmentIndex } from "@editframe/assets";

import { logger } from "@/logging";
import type { ProgressTracker } from "@/progress-tracking/ProgressTracker";
import { db } from "@/sql-client.server";
import { executeSpan } from "@/tracing";
import { storageProvider } from "@/util/storageProvider.server";
import { isobmffIndexFilePath, isobmffTrackFilePath } from "@/util/filePaths";

export interface UnprocessedFileInfo {
  id: string;
  md5: string;
  org_id: string;
  creator_id: string;
  filename: string;
  api_key_id: string | null;
  byte_size: number;
  expires_at?: Date | null;
}

/**
 * Process an ISOBMFF file using mediabunny.
 *
 * This function will process a unprocessed file as an isobmff file.
 *
 * End result:
 *
 * - Write the index to the storage provider
 * - Insert the isobmff file record
 * - Insert each track record
 * - Write each track to the storage provider
 *
 * @param unprocessedFilePath - The path to the unprocessed file. Should be a local file path. Typically a temp file.
 * @param unprocessedFile - The unprocessed file information.
 * @param progressTracker - The progress tracker.
 */
export async function processISOBMFF(
  unprocessedFilePath: string,
  unprocessedFile: UnprocessedFileInfo,
  progressTracker: ProgressTracker,
) {
  return executeSpan("processISOBMFF", async (span) => {
    span.setAttributes({
      path: unprocessedFilePath,
      fileInfo: JSON.stringify(unprocessedFile),
    });

    logger.info(`Starting ISOBMIFF processing for file: ${unprocessedFilePath}`);
    progressTracker.startHeartbeat();

    try {
      // Probe the file to get stream information
      const probe = await Probe.probePath(unprocessedFilePath);

      // Extract timing offset if present
      let startTimeOffsetMs: number | undefined;

      // Check for format-level start_time
      if (probe.format?.start_time) {
        const formatStartTime = parseFloat(probe.format.start_time);
        if (!isNaN(formatStartTime) && formatStartTime > 0) {
          startTimeOffsetMs = Math.round(formatStartTime * 1000);
          logger.trace(`Found format start_time offset: ${startTimeOffsetMs}ms`);
        }
      }

      // Check stream-level start_time for video track
      if (!startTimeOffsetMs) {
        const videoStream = probe.streams.find(s => s.codec_type === 'video');
        if (videoStream?.start_time) {
          const streamStartTime = parseFloat(String(videoStream.start_time));
          if (!isNaN(streamStartTime) && streamStartTime > 0) {
            startTimeOffsetMs = Math.round(streamStartTime * 1000);
            logger.trace(`Found stream start_time offset: ${startTimeOffsetMs}ms`);
          }
        }
      }

      // Create the ISOBMFF file record
      const isobmffFile = await db
        .insertInto("video2.isobmff_files")
        .values({
          id: unprocessedFile.id,
          org_id: unprocessedFile.org_id,
          creator_id: unprocessedFile.creator_id,
          filename: unprocessedFile.filename,
          api_key_id: unprocessedFile.api_key_id,
          md5: unprocessedFile.md5,
          fragment_index_complete: false, // Will be set to true after processing
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      progressTracker.writeProgress(0.2); // 20% - initial setup complete

      // Process each track separately and generate individual fragment indexes
      const trackPromises: Promise<{ trackId: number; fragmentIndex: any }>[] = [];
      const trackWriteStreams: Record<number, Writable> = {};
      const trackSizes: Record<number, number> = {};
      const progressPerTrack = 0.75 / probe.streams.length; // 75% progress for all tracks
      let currentProgress = 0.2; // Track progress locally

      console.log("Processing tracks", probe.streams);
      for (let streamIndex = 0; streamIndex < probe.streams.length; streamIndex++) {
        const stream = probe.streams[streamIndex]!;
        const trackId = streamIndex + 1; // Convert 0-based index to 1-based track ID

        // Skip non-media streams
        if (stream.codec_type !== 'video' && stream.codec_type !== 'audio') {
          continue;
        }

        // Initialize tracking
        trackSizes[trackId] = 0;

        // Create write stream for this track
        trackWriteStreams[trackId] = await storageProvider.createWriteStream(
          isobmffTrackFilePath({
            org_id: unprocessedFile.org_id,
            id: isobmffFile.id,
            track_id: trackId,
          }),
        );

        // Create promise to extract this track and generate its fragment index
        const trackPromise = (async () => {
          try {
            // Get a stream for just this track
            const trackStream = probe.createTrackReadstream(streamIndex);

            // Create PassThrough streams to tee the data
            const storageStream = new PassThrough();
            const indexStream = new PassThrough();

            // Track bytes written
            trackStream.on('data', (chunk: Buffer) => {
              trackSizes[trackId] = (trackSizes[trackId] || 0) + chunk.length;
            });

            // Pipe to both storage and index generation
            trackStream.pipe(storageStream);
            trackStream.pipe(indexStream);

            // Generate fragment index for this track
            // Map the single-track file's stream index 0 to the original multi-track ID
            const trackIdMapping = { 0: trackId };
            const fragmentIndexPromise = generateFragmentIndex(indexStream, undefined, trackIdMapping);

            // Pipe to storage
            await pipeline(storageStream, trackWriteStreams[trackId]!);

            // Wait for fragment index to complete
            const fragmentIndex = await fragmentIndexPromise;

            // Update progress
            currentProgress = Math.min(currentProgress + progressPerTrack, 0.95);
            progressTracker.writeProgress(currentProgress);

            logger.trace(`Track ${trackId} extraction complete, size: ${trackSizes[trackId]} bytes`);

            return { trackId, fragmentIndex };
          } catch (error) {
            logger.error(error, `Error processing track ${trackId}`);
            throw error;
          }
        })();

        trackPromises.push(trackPromise);
      }

      // Wait for all tracks to complete and collect their fragment indexes
      const trackResults = await Promise.all(trackPromises);
      console.log("Track results", trackResults);

      // Combine all track fragment indexes into a single index
      const fragmentIndex: Record<number, any> = {};
      for (const result of trackResults) {
        // Each track's fragment index has the remapped track ID
        Object.assign(fragmentIndex, result.fragmentIndex);
      }

      // Add timing offset to video tracks in the fragment index
      if (startTimeOffsetMs !== undefined) {
        for (const [_trackId, trackIndex] of Object.entries(fragmentIndex)) {
          if (trackIndex.type === 'video') {
            trackIndex.startTimeOffsetMs = startTimeOffsetMs;
          }
        }
      }

      // If no offset from format/stream, check first video segment for CTS > DTS
      if (startTimeOffsetMs === undefined) {
        const videoTrack = Object.values(fragmentIndex).find(t => t.type === 'video');
        if (videoTrack && videoTrack.segments.length > 0) {
          const firstSegment = videoTrack.segments[0]!;
          if (firstSegment.cts > firstSegment.dts) {
            const ctsOffsetMs = Math.round((firstSegment.cts - firstSegment.dts) / videoTrack.timescale * 1000);
            (videoTrack as any).startTimeOffsetMs = ctsOffsetMs;
            logger.trace(`Detected CTS offset from first segment: ${ctsOffsetMs}ms`);
          }
        }
      }

      // Write fragment index to storage
      await storageProvider.writeFile(
        isobmffIndexFilePath({
          org_id: unprocessedFile.org_id,
          id: isobmffFile.id,
        }),
        JSON.stringify(fragmentIndex),
      );

      // Insert track records into database
      const trackInserts = Object.entries(fragmentIndex).map(([trackIdStr, trackIndex]) => {
        const trackId = parseInt(trackIdStr);
        const stream = probe.streams[trackId - 1]; // Convert back to 0-based

        return {
          file_id: isobmffFile.id,
          track_id: trackId,
          type: trackIndex.type,
          codec_name: trackIndex.codec,
          byte_size: trackSizes[trackId] || 0,
          duration_ms: Math.round((trackIndex.duration / trackIndex.timescale) * 1000),
          complete: true,
          creator_id: unprocessedFile.creator_id,
          org_id: unprocessedFile.org_id,
          api_key_id: unprocessedFile.api_key_id,
          probe_info: JSON.stringify({
            ...trackIndex,
            // Include additional probe info if it's a video stream
            ...(stream && 'profile' in stream && { profile: stream.profile }),
            ...(stream && 'level' in stream && { level: stream.level }),
            ...(stream && 'bit_rate' in stream && { bit_rate: stream.bit_rate }),
          }),
        };
      });

      if (trackInserts.length === 0) {
        throw new Error(`No valid video or audio tracks found in file: ${unprocessedFilePath}`);
      }

      await db
        .insertInto("video2.isobmff_tracks")
        .values(trackInserts)
        .execute();

      // Update fragment_index_complete to true
      await db
        .updateTable("video2.isobmff_files")
        .set({ fragment_index_complete: true })
        .where("id", "=", isobmffFile.id)
        .execute();

      progressTracker.writeProgress(1); // 100% complete
      progressTracker.stopHeartbeat();

      logger.info(`ISOBMFF processing complete for file: ${unprocessedFilePath}`);
      return isobmffFile;
    } catch (error) {
      logger.error(error, `Error processing ISOBMFF file: ${unprocessedFilePath}`);
      progressTracker.writeFailure('');
      progressTracker.stopHeartbeat();
      throw error;
    }
  });
}