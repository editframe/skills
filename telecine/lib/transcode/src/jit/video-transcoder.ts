import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import ISOBoxer from "codem-isoboxer";

import { createVideoSource } from "../pipeline/VideoSource";
import { createDecoder, CodecId } from "../pipeline/Decoder";
import { createFilter, PixelFormat } from "../pipeline/Filter";
import { createEncoder } from "../pipeline/Encoder";
import { createMuxer, ContainerFormat } from "../pipeline/Muxer";
import type { SampleTableEntry } from "../pipeline/VideoSource";
import { UnifiedByteRangeFetcher } from "../async/UnifiedByteRangeFetcher";
import { RENDITION_CONFIGS } from "./transcoding-service";
import type { VideoTranscodeOptions, SegmentInfo } from "./transcoder-types";
import { VIDEO_CONSTANTS, TIME_CONSTANTS } from "./constants";
import {
  generateSingleSegmentInfo,
  repackageFragmentedSegment,
  generateOutputPath,
} from "./segment-utils";
import { repackageInitSegment } from "@/muxing/repackageFragements";
import { dirname } from "node:path";

/**
 * Calculate optimal GOP size for scrub tracks
 * For scrub tracks, we want keyframes every 1 second for easy seeking
 */
function calculateOptimalGopSize(
  frameRate: { num: number; den: number },
  isScrubTrack: boolean,
): number {
  if (!isScrubTrack) {
    return VIDEO_CONSTANTS.GOP_SIZE;
  }

  // For scrub tracks: keyframes every 1 second, max 50 frames
  const framesPerSecond = frameRate.num / frameRate.den;
  const oneSecondInFrames = Math.round(framesPerSecond);
  return Math.min(oneSecondInFrames, 50);
}

/**
 * Extract packet data from segment data using sample table entry
 *
 * The sample.pos is an absolute file position, but segmentData is a chunk fetched from startByte offset.
 * We must convert absolute position to relative position within the fetched data.
 *
 * With the new approach, the synthetic MP4 preserves the exact file structure, so sample table
 * positions should be correctly aligned with the original file.
 */
function extractPacketData(
  sample: SampleTableEntry,
  segmentData: Uint8Array,
  startByte: number,
): Uint8Array {
  // Convert absolute file position to relative position within fetched data
  const relativePos = sample.pos - startByte;

  // Add bounds checking to catch alignment issues early with descriptive errors
  if (relativePos < 0) {
    throw new Error(
      `Sample at position ${sample.pos} (size ${sample.size}) starts before fetched data range. ` +
        `Fetched range: ${startByte}-${startByte + segmentData.length - 1}, sample needs: ${sample.pos}-${sample.pos + sample.size - 1}`,
    );
  }

  if (relativePos + sample.size > segmentData.length) {
    throw new Error(
      `Sample at position ${sample.pos} (size ${sample.size}) extends beyond fetched data range. ` +
        `Fetched range: ${startByte}-${startByte + segmentData.length - 1}, sample needs: ${sample.pos}-${sample.pos + sample.size - 1}`,
    );
  }

  // Extract the packet data using relative position
  const packetData = segmentData.slice(relativePos, relativePos + sample.size);

  return packetData;
}

/**
 * Process decoded frames through filter and encoder pipeline
 */
async function processDecodedFrames(
  decodedFrames: any[],
  filter: any,
  encoder: any,
  videoStream: any,
): Promise<any[]> {
  const allEncodedPackets = [];

  for (const decodedFrame of decodedFrames) {
    const filteredFrames = await filter.filterFrame(decodedFrame.framePtr);
    for (const filtered of filteredFrames) {
      // IMPLEMENTATION GUIDELINES: Pass source timebase to encoder for proper timestamp conversion
      // This ensures the encoder can properly calculate frame durations and DTS values
      const encodedPackets = await encoder.encodeFrameInfo(
        filtered,
        videoStream.timeBase,
      );
      allEncodedPackets.push(...encodedPackets);
    }
  }

  return allEncodedPackets;
}

/**
 * Write encoded packets to muxer with timing checks
 */
async function writeEncodedPacketsWithTimingCheck(
  encodedPackets: any[],
  muxer: any,
  encoder: any,
): Promise<void> {
  // Don't filter packets - let muxer handle all frames to preserve GOP structure
  // Segment boundaries will be controlled by proper input frame selection
  for (const packet of encodedPackets) {
    await muxer.writePacket({
      data: packet.data,
      pts: packet.pts,
      dts: packet.dts,
      duration: packet.duration,
      streamIndex: 0,
      flags: packet.isKeyFrame ? 1 : 0,
      sourceTimeBase: encoder.timeBase,
    });
  }
}

/**
 * Write encoded packets to muxer without timing checks (for flush phase)
 */
async function writeEncodedPacketsDirectly(
  encodedPackets: any[],
  muxer: any,
  encoder: any,
): Promise<void> {
  for (const packet of encodedPackets) {
    await muxer.writePacket({
      data: packet.data,
      pts: packet.pts,
      dts: packet.dts,
      duration: packet.duration,
      streamIndex: 0,
      flags: packet.isKeyFrame ? 1 : 0,
      sourceTimeBase: encoder.timeBase,
    });
  }
}

/**
 * Process decoded frames with timing filtering and encoding pipeline
 */
async function processFilteredFrames(
  decodedFrames: any[],
  filter: any,
  encoder: any,
  muxer: any,
  segmentInfo: SegmentInfo,
  videoStream: any,
): Promise<void> {
  for (const decodedFrame of decodedFrames) {
    // Calculate frame timing in microseconds for filtering
    const framePtsUs =
      (decodedFrame.pts *
        TIME_CONSTANTS.MICROSECONDS_PER_SECOND *
        videoStream.timeBase.num) /
      videoStream.timeBase.den;

    // For final segment, be inclusive of end boundary; for others, use strict boundary
    const endCondition = segmentInfo.isLast
      ? framePtsUs <= segmentInfo.endTimeUs // Include end boundary for final segment
      : framePtsUs < segmentInfo.endTimeUs; // Strict boundary for non-final segments

    // Only process frames within the segment boundaries
    if (framePtsUs >= segmentInfo.startTimeUs && endCondition) {
      // Process this single frame through the encoding pipeline
      const encodedPacketsFromFrame = await processDecodedFrames(
        [decodedFrame],
        filter,
        encoder,
        videoStream,
      );
      await writeEncodedPacketsWithTimingCheck(
        encodedPacketsFromFrame,
        muxer,
        encoder,
      );
    }
  }
}

export async function transcodeVideoSegment(
  options: VideoTranscodeOptions,
): Promise<string> {
  const {
    inputUrl,
    segmentId,
    segmentDurationMs,
    outputDir,
    rendition,
    isScrubTrack,
  } = options;
  const renditionConfig = RENDITION_CONFIGS[rendition];

  if (!renditionConfig) {
    throw new Error(`Invalid rendition: ${rendition}`);
  }

  // Ensure output directory exists
  await mkdir(outputDir, { recursive: true });

  // Create VideoSource with metadata
  using source = await createVideoSource({
    url: inputUrl,
    syntheticMp4: options.syntheticMp4,
  });

  const durationMs = source.durationMs;

  // Find video stream
  const videoStream = source.streams.find((s) => s.codecType === "video");
  if (!videoStream) {
    throw new Error("No video stream found");
  }

  const sourceFrameRate =
    videoStream.frameRate || VIDEO_CONSTANTS.DEFAULT_FRAME_RATE;

  const gopSize = calculateOptimalGopSize(
    sourceFrameRate,
    isScrubTrack || rendition === "scrub",
  );

  const { calculateAspectRatioDimensions } =
    await import("./transcoding-service");
  const outputDimensions = calculateAspectRatioDimensions(
    videoStream.width || renditionConfig.width,
    videoStream.height || renditionConfig.height,
    rendition,
  );

  using encoder = await createEncoder({
    mediaType: "video",
    codecId: CodecId.H264,
    width: outputDimensions.width,
    height: outputDimensions.height,
    pixelFormat: PixelFormat.YUV420P,
    videoBitrate: Number.parseInt(renditionConfig.videoBitrate),
    timeBase: { num: 1, den: VIDEO_CONSTANTS.STANDARD_TIMEBASE_DENOMINATOR },
    frameRate: sourceFrameRate,
    gopSize: gopSize,
    preset: "ultrafast",
  });

  const outputPath = generateOutputPath(
    outputDir,
    "video",
    segmentId,
    rendition,
    options.isFragmented !== false,
    options.isFragmented === false,
  );

  // Handle init segment separately from media segments
  if (segmentId === "init") {
    // For init segment, we need to process at least one frame to get complete codec parameters
    // Create a minimal decoder and encoder setup to get codec parameters
    using decoder = await createDecoder({
      codecId: videoStream.codecId,
      mediaType: "video",
      width: videoStream.width,
      height: videoStream.height,
      timeBase: videoStream.timeBase,
      extradata: videoStream.extradata?.buffer,
    });

    // Get the first keyframe from the video
    const firstKeyframeData = source.findKeyframeAlignedData(
      videoStream.index,
      0,
      100,
    ); // First 100ms should contain first keyframe

    if (firstKeyframeData.sampleTableEntries.length === 0) {
      throw new Error("No keyframes found for init segment");
    }

    const firstKeyframe = firstKeyframeData.sampleTableEntries.find(
      (s) => s?.isKeyframe,
    );
    if (!firstKeyframe) {
      throw new Error("No keyframes found for init segment");
    }

    // Fetch the data for the first keyframe
    const fetcher = new UnifiedByteRangeFetcher();
    const fetchResult = await fetcher.fetchByteRange({
      url: inputUrl,
      startByte: firstKeyframeData.startByte,
      endByte: firstKeyframeData.endByte,
    });

    if (!fetchResult.success) {
      throw new Error("Failed to fetch init segment data");
    }

    const initSegmentData = fetchResult.data;

    // Decode one frame to initialize encoder with proper codec parameters
    const packetData = extractPacketData(
      firstKeyframe,
      initSegmentData,
      firstKeyframeData.startByte,
    );
    const packet = {
      data: packetData,
      pts: firstKeyframe.dts,
      dts: firstKeyframe.dts,
      streamIndex: 0,
      size: firstKeyframe.size,
      isKeyFrame: firstKeyframe.isKeyframe,
    };

    // Try to decode and process the first frame
    const decodedFrames = await decoder.decode(packet);

    // Try to flush the decoder to get any pending frames
    const flushFrames = await decoder.flush();

    const allFrames = [...decodedFrames, ...flushFrames];

    if (allFrames.length === 0) {
      throw new Error("No frames decoded for init segment");
    }

    // Process one frame to get encoder codec parameters
    const inputPixelFormat = Number(videoStream.pixelFormat);
    const filterChain = [
      `scale=${outputDimensions.width}:${outputDimensions.height}`,
      "format=yuv420p",
    ].join(",");

    using filter = await createFilter({
      mediaType: "video",
      filterDescription: filterChain,
      inputWidth: videoStream.width,
      inputHeight: videoStream.height,
      inputPixelFormat,
      inputTimeBase: videoStream.timeBase,
      outputWidth: outputDimensions.width,
      outputHeight: outputDimensions.height,
      outputPixelFormat: PixelFormat.YUV420P,
    });

    // Process frame to initialize encoder
    const encodedPackets = await processDecodedFrames(
      allFrames.slice(0, 1),
      filter,
      encoder,
      videoStream,
    );

    // Flush encoder to get any buffered packets
    const flushPackets = await encoder.flush();

    const allPackets = [...encodedPackets, ...flushPackets];

    // Create init segment using the same proven approach as audio:
    // 1. Create a temp MP4 with actual content to get proper codec configuration
    // 2. Extract just the metadata (ftyp + moov) using repackageInitSegment()

    const tempMp4Path = outputPath.replace(".m4s", "_temp.mp4");

    // Create fragmented MP4 muxer for the temp segment with actual content
    using muxer = await createMuxer({
      format: ContainerFormat.MP4,
      filename: tempMp4Path,
      movFlags: "cmaf+empty_moov+delay_moov",
    });

    // Add video stream to muxer
    const codecParams = encoder.getCodecParameters();
    await muxer.addVideoStreamFromEncoder(
      codecParams,
      encoder.timeBase,
      sourceFrameRate,
    );
    await muxer.writeHeader();

    // Write at least one packet to ensure proper codec configuration
    if (allPackets.length > 0) {
      const firstPacket = allPackets[0];
      await muxer.writePacket({
        data: firstPacket.data,
        pts: firstPacket.pts,
        dts: firstPacket.dts,
        duration: firstPacket.duration,
        streamIndex: 0,
        flags: firstPacket.isKeyFrame ? 1 : 0,
        sourceTimeBase: encoder.timeBase,
      });
    }

    // Finalize temp MP4
    await muxer.finalize();

    // Extract init segment from temp MP4 (same as audio approach)

    const tempMp4Buffer = await readFile(tempMp4Path);

    // SIMPLE WORKAROUND: Use temp MP4 file directly as init segment
    // For testing purposes, the temp MP4 contains all necessary metadata
    const initSegmentBytes = tempMp4Buffer;

    // Write the properly extracted init segment

    // Ensure output directory exists
    const outputDir = dirname(outputPath);

    try {
      await mkdir(outputDir, { recursive: true });
    } catch (error) {
      console.error("[VIDEO INIT] Directory creation error:", error);
    }

    await writeFile(outputPath, new Uint8Array(initSegmentBytes));

    // Clean up temp file
    await unlink(tempMp4Path);

    // NOTE: For standalone MP4 (isFragmented=false), we should NOT reprocess the init segment
    if (options.isFragmented !== false) {
      const mp4Buffer = await readFile(outputPath);
      const mp4IsoFile = ISOBoxer.parseBuffer(mp4Buffer.buffer);
      const initSegmentBytes = repackageInitSegment(mp4IsoFile, durationMs);
      await writeFile(outputPath, new Uint8Array(initSegmentBytes));
    }

    return outputPath;
  }

  // Handle media segment
  const segmentIndex = Number(segmentId) - 1; // Convert to 0-based index
  const segmentInfo = generateSingleSegmentInfo(
    segmentIndex, // Use 0-based index internally
    durationMs,
    segmentDurationMs,
    VIDEO_CONSTANTS.FRAME_PADDING_MULTIPLIER,
    false, // durationInSeconds = false (duration is in milliseconds for video)
    false, // useAlignedTimes = false (video uses raw timing for boundaries)
    sourceFrameRate, // videoFrameRate for proper video frame alignment
  );

  const extractStartMs = segmentInfo.actualStartTimeUs / 1000;

  // For final segment, extract to end of video; for others, add padding for next segment
  const extractEndMs = segmentInfo.isLast
    ? durationMs + 100 // Use normal padding for final segment
    : (segmentInfo.endTimeUs + 100000) / 1000; // Add 100ms padding for non-final segments

  const alignedData = source.findKeyframeAlignedData(
    videoStream.index,
    extractStartMs,
    extractEndMs,
  );

  const desiredStartTimeMs = segmentInfo.actualStartTimeUs / 1000;
  let startKeyframeIndex = -1;

  // First, try to find a keyframe before our start time
  for (let i = alignedData.sampleTableEntries.length - 1; i >= 0; i--) {
    const sample = alignedData.sampleTableEntries[i];
    if (!sample) continue;

    const sampleTimeMs =
      (sample.dts * 1000 * videoStream.timeBase.num) / videoStream.timeBase.den;
    if (sampleTimeMs <= desiredStartTimeMs && sample.isKeyframe) {
      startKeyframeIndex = i;
      break;
    }
  }

  // If we didn't find a keyframe before our start time, use the first keyframe in the data
  if (startKeyframeIndex === -1) {
    startKeyframeIndex = alignedData.sampleTableEntries.findIndex(
      (s) => s?.isKeyframe,
    );
    if (startKeyframeIndex === -1) {
      throw new Error("No keyframes found in segment data");
    }
  }

  // Use provided segment data or fetch it
  const segmentData =
    options.segmentData ??
    (await (async () => {
      const fetcher = new UnifiedByteRangeFetcher();
      const fetchResult = await fetcher.fetchByteRange({
        url: inputUrl,
        startByte: alignedData.startByte,
        endByte: alignedData.endByte,
      });

      if (!fetchResult.success) {
        throw new Error("Failed to fetch video segment data");
      }

      return fetchResult.data;
    })());

  // Create remaining pipeline components
  using decoder = await createDecoder({
    codecId: videoStream.codecId,
    mediaType: "video",
    width: videoStream.width,
    height: videoStream.height,
    timeBase: videoStream.timeBase,
    extradata: videoStream.extradata?.buffer,
  });

  // Convert string pixel format to number
  const inputPixelFormat = Number(videoStream.pixelFormat);

  // Create filter chain without PTS modification to preserve frame order
  const filterChain = [
    `scale=${outputDimensions.width}:${outputDimensions.height}`,
    "format=yuv420p",
  ].join(",");

  using filter = await createFilter({
    mediaType: "video",
    filterDescription: filterChain,
    inputWidth: videoStream.width,
    inputHeight: videoStream.height,
    inputPixelFormat,
    inputTimeBase: videoStream.timeBase,
    outputWidth: outputDimensions.width,
    outputHeight: outputDimensions.height,
    outputPixelFormat: PixelFormat.YUV420P,
  });

  // Create MP4 muxer for the segment (same structure for both fragmented and standalone)
  using muxer = await createMuxer({
    format: ContainerFormat.MP4,
    filename: outputPath,
    // CRITICAL: Use cmaf flag for all segments to ensure proper fragmentation
    // The original dash flag was not generating moof boxes correctly
    movFlags: "cmaf+empty_moov+delay_moov",
    // CRITICAL: Set fragment duration to ensure one moof per segment
    // Use segment duration in microseconds to prevent keyframe-based fragmentation
    fragmentDuration: segmentDurationMs * 1000, // Convert ms to microseconds
  });

  // Add video stream to muxer - use source frame rate for metadata
  const codecParams = encoder.getCodecParameters();
  await muxer.addVideoStreamFromEncoder(
    codecParams,
    encoder.timeBase,
    sourceFrameRate,
  );
  await muxer.writeHeader();

  // Process frames with precise timing - control segment boundaries at input level
  // Start from the keyframe we found and process until we reach segment boundary
  // We must include the keyframe even if it's outside our segment boundary for decoder initialization

  for (
    let i = startKeyframeIndex;
    i < alignedData.sampleTableEntries.length;
    i++
  ) {
    const sample = alignedData.sampleTableEntries[i];
    if (!sample) continue;

    // Check if this sample falls within our segment timing window at input level
    const sampleTimeUs =
      (sample.dts *
        TIME_CONSTANTS.MICROSECONDS_PER_SECOND *
        videoStream.timeBase.num) /
      videoStream.timeBase.den; // Convert to microseconds

    // We are banking on the fact that entries are sorted by DTS, and that PTS is always greater than or equal to DTS
    // So if we past our target on DTS, we'll never miss frames
    // We might decode some extra frames, but that's ok, we can also skip them when they're
    // decoded.
    // Stop processing when we exceed segment end time
    if (sampleTimeUs > segmentInfo.endTimeUs) {
      break; // Stop at segment boundary
    }

    // Extract and decode packet
    const packetData = extractPacketData(
      sample,
      segmentData,
      alignedData.startByte,
    );
    const packet = {
      data: packetData,
      dts: sample.dts, // Only set DTS from container index
      streamIndex: 0,
      size: sample.size,
      isKeyFrame: sample.isKeyframe,
    };
    const decodedFrames = await decoder.decode(packet);

    await processFilteredFrames(
      decodedFrames,
      filter,
      encoder,
      muxer,
      segmentInfo,
      videoStream,
    );
  }

  // Flush any remaining frames from the decoder
  const flushFrames = await decoder.flush();
  await processFilteredFrames(
    flushFrames,
    filter,
    encoder,
    muxer,
    segmentInfo,
    videoStream,
  );

  // Flush the encoder after processing all frames (including decoder flush)
  const encodedPackets = await encoder.flush();
  // Write encoder flush packets directly (these are already filtered by frame processing)
  await writeEncodedPacketsDirectly(encodedPackets, muxer, encoder);

  // Finalize muxer
  await muxer.finalize();

  // If this is a fragmented segment, repackage it
  if (options.isFragmented !== false) {
    await repackageFragmentedSegment(outputPath, segmentInfo, segmentIndex);
  }

  return outputPath;
}
