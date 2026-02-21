import { Readable, Transform, Writable } from "node:stream";
import { pipeline } from "node:stream/promises";
import debug from "debug";
import type { TrackFragmentIndex, TrackSegment } from "./Probe.js";
import { PacketProbe } from "./Probe.js";

const log = debug("ef:generateFragmentIndex");

// Minimum segment duration in milliseconds
const MIN_SEGMENT_DURATION_MS = 2000; // 2 seconds
const MS_PER_SECOND = 1000;

// ============================================================================
// Core Domain Types (Type Safety as Invariant Enforcement)
// ============================================================================

/** Raw packet from ffprobe - the fundamental unit of media data */
interface ProbePacket {
  stream_index: number;
  pts: number;
  dts: number;
  pts_time: number;
  dts_time: number;
  duration?: number;
  pos?: number;
  flags?: string;
}

/** Video packet with keyframe status - invariant: isKeyframe is always defined */
interface VideoPacket {
  pts: number;
  dts: number;
  duration?: number;
  isKeyframe: boolean;
}

/** Audio packet - simpler than video, no keyframe concept */
interface AudioPacket {
  pts: number;
  dts: number;
  duration?: number;
}

/** Fragment timing data - packets organized by fragment */
interface FragmentTimingData {
  fragmentIndex: number;
  videoPackets: VideoPacket[];
  audioPackets: AudioPacket[];
}

/** Timebase for timestamp conversion */
interface Timebase {
  num: number;
  den: number;
}

// Helper function to construct H.264 codec string from profile and level
function constructH264CodecString(
  codecTagString: string,
  profile?: string,
  level?: number,
): string {
  if (codecTagString !== "avc1" || !profile || level === undefined) {
    return codecTagString;
  }

  // Map H.264 profile names to profile_idc values
  const profileMap: Record<string, number> = {
    Baseline: 0x42,
    Main: 0x4d,
    High: 0x64,
    "High 10": 0x6e,
    "High 422": 0x7a,
    "High 444": 0xf4,
  };

  const profileIdc = profileMap[profile];
  if (!profileIdc) {
    return codecTagString;
  }

  // Format: avc1.PPCCLL where PP=profile_idc, CC=constraint_flags, LL=level_idc
  const profileHex = profileIdc.toString(16).padStart(2, "0");
  const constraintFlags = "00"; // Most common case
  const levelHex = level.toString(16).padStart(2, "0");

  return `${codecTagString}.${profileHex}${constraintFlags}${levelHex}`;
}

interface MP4BoxHeader {
  type: string;
  offset: number;
  size: number;
  headerSize: number;
}

interface Fragment {
  type: "init" | "media";
  offset: number;
  size: number;
  moofOffset?: number;
  mdatOffset?: number;
}

/**
 * Streaming MP4 box parser that detects box boundaries without loading entire file into memory
 */
class StreamingBoxParser extends Transform {
  private buffer = Buffer.alloc(0);
  private globalOffset = 0;
  private fragments: Fragment[] = [];
  private currentMoof: MP4BoxHeader | null = null;
  private initSegmentEnd = 0;
  private foundBoxes: MP4BoxHeader[] = [];

  constructor() {
    super({ objectMode: false });
  }

  _transform(chunk: Buffer, _encoding: BufferEncoding, callback: () => void) {
    // Append new data to our sliding buffer
    this.buffer = Buffer.concat([this.buffer, chunk]);

    // Parse all complete boxes in the current buffer
    this.parseBoxes();

    // Pass through the original chunk unchanged
    this.push(chunk);
    callback();
  }

  private parseBoxes() {
    let bufferOffset = 0;

    while (this.buffer.length - bufferOffset >= 8) {
      const size = this.buffer.readUInt32BE(bufferOffset);
      const type = this.buffer
        .subarray(bufferOffset + 4, bufferOffset + 8)
        .toString("ascii");

      // Invalid or incomplete box
      if (size === 0 || size < 8 || this.buffer.length < bufferOffset + size) {
        break;
      }

      const box: MP4BoxHeader = {
        type,
        offset: this.globalOffset + bufferOffset,
        size,
        headerSize: 8,
      };

      log(`Found box: ${box.type} at offset ${box.offset}, size ${box.size}`);
      this.foundBoxes.push(box);
      this.handleBox(box);

      bufferOffset += size;
    }

    // Update global offset and trim processed data from buffer
    this.globalOffset += bufferOffset;
    this.buffer = this.buffer.subarray(bufferOffset);
  }

  private handleBox(box: MP4BoxHeader) {
    switch (box.type) {
      case "ftyp":
      case "moov":
        // Part of init segment
        this.initSegmentEnd = Math.max(
          this.initSegmentEnd,
          box.offset + box.size,
        );
        break;

      case "moof":
        this.currentMoof = box;
        break;

      case "mdat":
        if (this.currentMoof) {
          // Found a complete fragment (moof + mdat pair) - fragmented MP4
          this.fragments.push({
            type: "media",
            offset: this.currentMoof.offset,
            size: box.offset + box.size - this.currentMoof.offset,
            moofOffset: this.currentMoof.offset,
            mdatOffset: box.offset,
          });
          this.currentMoof = null;
        } else {
          // mdat without moof - this is non-fragmented content, not a fragment
          // Common in mixed MP4 files where initial content is non-fragmented
          // followed by fragmented content. Ignore for fragment indexing.
          log(
            `Found non-fragmented mdat at offset ${box.offset}, skipping for fragment index`,
          );
        }
        break;
    }
  }

  _flush(callback: () => void) {
    this.parseBoxes(); // Process any remaining buffered data

    // Probe always outputs fragmented MP4
    // Init segment is ftyp + moov boxes before the first moof
    if (this.initSegmentEnd > 0) {
      this.fragments.unshift({
        type: "init",
        offset: 0,
        size: this.initSegmentEnd,
      });
    }

    callback();
  }

  getFragments(): Fragment[] {
    return this.fragments;
  }
}

// Helper function to create a readable stream from fragment data
function createFragmentStream(fragmentData: Uint8Array): Readable {
  let offset = 0;
  return new Readable({
    read() {
      if (offset >= fragmentData.length) {
        this.push(null);
        return;
      }

      const chunkSize = Math.min(64 * 1024, fragmentData.length - offset); // 64KB chunks
      const chunk = fragmentData.slice(offset, offset + chunkSize);
      offset += chunkSize;
      this.push(Buffer.from(chunk));
    },
  });
}

// Helper to convert timestamp from ffprobe timebase to track timescale
function convertTimestamp(
  pts: number,
  timebase: Timebase,
  timescale: number,
): number {
  return Math.round((pts * timescale) / timebase.den);
}

// Helper to calculate duration in milliseconds from timescale units
function durationMsFromTimescale(
  durationTimescale: number,
  timescale: number,
): number {
  return (durationTimescale / timescale) * MS_PER_SECOND;
}

// Helper to calculate segment byte range from accumulated fragments
function calculateSegmentByteRange(
  accumulatedFragments: Array<{ fragment: Fragment }>,
): { offset: number; size: number } {
  const firstFrag = accumulatedFragments[0]!;
  const lastFrag = accumulatedFragments[accumulatedFragments.length - 1]!;
  return {
    offset: firstFrag.fragment.offset,
    size:
      lastFrag.fragment.offset +
      lastFrag.fragment.size -
      firstFrag.fragment.offset,
  };
}

// Explicit enumeration of segment accumulation state (Enumerate the Core Concept)
type SegmentAccumulationState =
  | { type: "idle" }
  | {
      type: "accumulating";
      startPts: number;
      startDts: number;
      fragments: Array<{
        fragment: Fragment;
        fragmentData: FragmentTimingData;
      }>;
    };

// Invariant: Segment must start on keyframe (for video) and have minimum duration
interface SegmentEvaluation {
  cts: number;
  dts: number;
  duration: number;
  offset: number;
  size: number;
}

// Track processing context - single source of truth for track processing
interface TrackProcessingContext {
  timebase: Timebase;
  timescale: number;
  fragmentTimingData: FragmentTimingData[];
  mediaFragments: Fragment[];
  // Cached filtered packets for this stream (Performance Through Caching)
  streamPackets: ProbePacket[];
  streamType: "video" | "audio";
  streamIndex: number;
}

// Segment accumulator that encapsulates accumulation logic
class SegmentAccumulator {
  private state: SegmentAccumulationState = { type: "idle" };
  private readonly context: TrackProcessingContext;
  private readonly minDurationMs: number;

  constructor(context: TrackProcessingContext, minDurationMs: number) {
    this.context = context;
    this.minDurationMs = minDurationMs;
  }

  // Evaluation: Determine if we should finalize (semantics)
  shouldFinalize(nextKeyframe: { pts: number; dts: number } | null): boolean {
    if (this.state.type !== "accumulating") {
      return false;
    }

    const durationMs = this.calculateAccumulatedDurationMs();
    const hasMinimumDuration = durationMs >= this.minDurationMs;

    // For video: finalize on keyframe + minimum duration
    // For audio: finalize on minimum duration (no keyframe requirement)
    if (this.context.streamType === "video") {
      return hasMinimumDuration && nextKeyframe !== null;
    } else {
      return hasMinimumDuration;
    }
  }

  // Evaluation: Calculate what the segment would be (semantics)
  evaluateSegment(
    nextBoundary: { pts: number } | null,
  ): SegmentEvaluation | null {
    if (this.state.type !== "accumulating") {
      return null;
    }

    const segmentCts = convertTimestamp(
      this.state.startPts,
      this.context.timebase,
      this.context.timescale,
    );
    const segmentDts = convertTimestamp(
      this.state.startDts,
      this.context.timebase,
      this.context.timescale,
    );
    const segmentDuration = this.calculateSegmentDuration(
      segmentCts,
      nextBoundary,
    );
    const { offset, size } = calculateSegmentByteRange(this.state.fragments);

    return {
      cts: segmentCts,
      dts: segmentDts,
      duration: segmentDuration,
      offset,
      size,
    };
  }

  // Application: Add fragment to accumulation (mechanism)
  addFragment(fragment: Fragment, fragmentData: FragmentTimingData): void {
    if (this.state.type === "idle") {
      // Start accumulation - invariant: video segments must start on keyframe
      const startPts = this.getStartPts(fragmentData);
      const startDts = this.getStartDts(fragmentData);
      this.state = {
        type: "accumulating",
        startPts,
        startDts,
        fragments: [{ fragment, fragmentData }],
      };
    } else {
      // Continue accumulation
      this.state.fragments.push({ fragment, fragmentData });
    }
  }

  // Application: Reset accumulation (mechanism)
  reset(): void {
    this.state = { type: "idle" };
  }

  // Application: Start new segment with keyframe (mechanism)
  startNewSegment(keyframe: { pts: number; dts: number }): void {
    this.state = {
      type: "accumulating",
      startPts: keyframe.pts,
      startDts: keyframe.dts,
      fragments: [],
    };
  }

  // Query: Get current state
  getState(): SegmentAccumulationState {
    return this.state;
  }

  // Query: Check if accumulating
  isAccumulating(): boolean {
    return this.state.type === "accumulating";
  }

  // Private helpers
  private calculateAccumulatedDurationMs(): number {
    if (this.state.type !== "accumulating") {
      return 0;
    }

    const lastFrag = this.state.fragments[this.state.fragments.length - 1]!;
    const lastPacket = this.getLastPacket(lastFrag.fragmentData);
    const endCts = convertTimestamp(
      lastPacket.pts + (lastPacket.duration || 0),
      this.context.timebase,
      this.context.timescale,
    );
    const startCts = convertTimestamp(
      this.state.startPts,
      this.context.timebase,
      this.context.timescale,
    );
    return durationMsFromTimescale(endCts - startCts, this.context.timescale);
  }

  private calculateSegmentDuration(
    segmentCts: number,
    nextBoundary: { pts: number } | null,
  ): number {
    if (nextBoundary) {
      const nextSegmentCts = convertTimestamp(
        nextBoundary.pts,
        this.context.timebase,
        this.context.timescale,
      );
      return nextSegmentCts - segmentCts;
    }

    // Last segment: duration to end of all packets
    // Use pre-cached streamPackets (Performance Through Caching)
    const sortedPackets = [...this.context.streamPackets].sort(
      (a, b) => a.pts - b.pts,
    );
    const lastPacket = sortedPackets[sortedPackets.length - 1]!;
    const streamEnd = convertTimestamp(
      lastPacket.pts + (lastPacket.duration || 0),
      this.context.timebase,
      this.context.timescale,
    );
    return streamEnd - segmentCts;
  }

  private getStartPts(fragmentData: FragmentTimingData): number {
    if (this.context.streamType === "video") {
      const keyframe = fragmentData.videoPackets.find((p) => p.isKeyframe);
      return keyframe?.pts ?? fragmentData.videoPackets[0]?.pts ?? 0;
    } else {
      return fragmentData.audioPackets[0]?.pts ?? 0;
    }
  }

  private getStartDts(fragmentData: FragmentTimingData): number {
    if (this.context.streamType === "video") {
      const keyframe = fragmentData.videoPackets.find((p) => p.isKeyframe);
      return keyframe?.dts ?? fragmentData.videoPackets[0]?.dts ?? 0;
    } else {
      return fragmentData.audioPackets[0]?.dts ?? 0;
    }
  }

  private getLastPacket(fragmentData: FragmentTimingData): {
    pts: number;
    duration?: number;
  } {
    if (this.context.streamType === "video") {
      const packets = fragmentData.videoPackets;
      return packets[packets.length - 1]!;
    } else {
      const packets = fragmentData.audioPackets;
      return packets[packets.length - 1]!;
    }
  }
}

// Helper function to extract fragment data (init + media fragment)

export const generateFragmentIndex = async (
  inputStream: Readable,
  startTimeOffsetMs?: number,
  trackIdMapping?: Record<number, number>, // Map from source track ID to desired track ID
): Promise<Record<number, TrackFragmentIndex>> => {
  // Step 1: Create a streaming parser that detects fragment boundaries
  const parser = new StreamingBoxParser();

  // Step 2: Create a passthrough stream that doesn't buffer everything
  const chunks: Buffer[] = [];
  let totalSize = 0;

  const dest = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(chunk);
      totalSize += chunk.length;
      callback();
    },
  });

  // Process the stream through both parser and collection
  await pipeline(inputStream, parser, dest);
  const fragments = parser.getFragments();

  // If no data was collected, return empty result
  if (totalSize === 0) {
    return {};
  }

  // Step 3: Use ffprobe to analyze the complete stream for track metadata
  const completeData = Buffer.concat(chunks as readonly Uint8Array[]);
  const completeStream = createFragmentStream(
    new Uint8Array(
      completeData.buffer,
      completeData.byteOffset,
      completeData.byteLength,
    ),
  );

  let probe: PacketProbe;
  try {
    probe = await PacketProbe.probeStream(completeStream);
  } catch (error) {
    console.warn("Failed to probe stream with ffprobe:", error);
    return {};
  }

  const videoStreams = probe.videoStreams;
  const audioStreams = probe.audioStreams;

  const trackIndexes: Record<number, TrackFragmentIndex> = {};
  const initFragment = fragments.find((f) => f.type === "init");
  const mediaFragments = fragments.filter((f) => f.type === "media");

  // Map packets to fragments using byte position for moof+mdat boundaries
  // But create contiguous segments based on keyframes
  const fragmentTimingData: FragmentTimingData[] = [];

  for (
    let fragmentIndex = 0;
    fragmentIndex < mediaFragments.length;
    fragmentIndex++
  ) {
    const fragment = mediaFragments[fragmentIndex]!;

    // Find packets that belong to this fragment based on byte position (moof+mdat boundaries)
    const fragmentStart = fragment.offset;
    const fragmentEnd = fragment.offset + fragment.size;

    const videoPackets = probe.packets
      .filter((packet) => {
        const stream = videoStreams.find(
          (s) => s.index === packet.stream_index,
        );
        return (
          stream?.codec_type === "video" &&
          packet.pos !== undefined &&
          packet.pos >= fragmentStart &&
          packet.pos < fragmentEnd
        );
      })
      .map((packet) => ({
        pts: packet.pts,
        dts: packet.dts,
        duration: packet.duration,
        isKeyframe: packet.flags?.includes("K") ?? false,
      }));

    const audioPackets = probe.packets
      .filter((packet) => {
        const stream = audioStreams.find(
          (s) => s.index === packet.stream_index,
        );
        return (
          stream?.codec_type === "audio" &&
          packet.pos !== undefined &&
          packet.pos >= fragmentStart &&
          packet.pos < fragmentEnd
        );
      })
      .map((packet) => ({
        pts: packet.pts,
        dts: packet.dts,
        duration: packet.duration,
      }));

    fragmentTimingData.push({
      fragmentIndex,
      videoPackets,
      audioPackets,
    });
  }

  // Unified track processing function (One Direction of Truth)
  const processTrack = (
    streamIndex: number,
    streamType: "video" | "audio",
    timebase: Timebase,
    allPackets: ProbePacket[],
  ): TrackSegment[] => {
    const segments: TrackSegment[] = [];
    const timescale = Math.round(timebase.den / timebase.num);

    // Cache filtered packets once (Performance Through Caching)
    const streamPackets = allPackets.filter(
      (p) => p.stream_index === streamIndex,
    );

    const context: TrackProcessingContext = {
      timebase,
      timescale,
      fragmentTimingData,
      mediaFragments,
      streamPackets,
      streamType,
      streamIndex,
    };

    const accumulator = new SegmentAccumulator(
      context,
      MIN_SEGMENT_DURATION_MS,
    );

    for (let i = 0; i < fragmentTimingData.length; i++) {
      const fragmentData = fragmentTimingData[i]!;
      const fragment = mediaFragments[fragmentData.fragmentIndex]!;
      const packets =
        streamType === "video"
          ? fragmentData.videoPackets
          : fragmentData.audioPackets;

      log(
        `Fragment ${fragmentData.fragmentIndex}: ${packets.length} ${streamType} packets`,
      );

      if (packets.length === 0) {
        log(
          `Skipping fragment ${fragmentData.fragmentIndex} - no ${streamType} packets`,
        );
        continue;
      }

      if (streamType === "video") {
        // Video: segments must start on keyframes
        const keyframe = fragmentData.videoPackets.find((p) => p.isKeyframe);
        const hasKeyframe = keyframe !== undefined;

        // Start new segment on keyframe if none exists
        if (!accumulator.isAccumulating() && hasKeyframe) {
          accumulator.startNewSegment({
            pts: keyframe.pts,
            dts: keyframe.dts,
          });
          accumulator.addFragment(fragment, fragmentData);
          continue;
        }

        // Skip fragments without keyframes if no segment started
        if (!accumulator.isAccumulating()) {
          continue;
        }

        // Check if we should finalize when encountering a new keyframe
        if (hasKeyframe) {
          if (
            accumulator.shouldFinalize({ pts: keyframe.pts, dts: keyframe.dts })
          ) {
            // Duration should be to the start of this keyframe (start of next segment)
            const nextBoundary = { pts: keyframe.pts };
            const evaluation = accumulator.evaluateSegment(nextBoundary);
            if (evaluation) {
              segments.push(evaluation);
            }
            accumulator.reset();
            accumulator.startNewSegment({
              pts: keyframe.pts,
              dts: keyframe.dts,
            });
          }
        }
      } else {
        // Audio: no keyframe requirement, just duration-based
        if (!accumulator.isAccumulating()) {
          accumulator.addFragment(fragment, fragmentData);
          continue;
        }

        // Check if we should finalize based on accumulated duration
        if (accumulator.shouldFinalize(null)) {
          // Duration should be to the start of this fragment (start of next segment)
          const nextBoundary = { pts: fragmentData.audioPackets[0]!.pts };
          const evaluation = accumulator.evaluateSegment(nextBoundary);
          if (evaluation) {
            segments.push(evaluation);
          }
          accumulator.reset();
        }
      }

      // Add fragment to current segment
      accumulator.addFragment(fragment, fragmentData);
    }

    // Finalize any remaining accumulated fragments
    if (accumulator.isAccumulating()) {
      const evaluation = accumulator.evaluateSegment(null);
      if (evaluation) {
        segments.push(evaluation);
      }
    }

    return segments;
  };

  // Step 4: Process video tracks using ffprobe data
  for (const videoStream of videoStreams) {
    // Get timebase for this stream to convert timestamps
    const timebase = probe.videoTimebase;
    if (!timebase) {
      console.warn("No timebase found for video stream");
      continue;
    }

    const timescale = Math.round(timebase.den / timebase.num);

    // Cache filtered packets once (Performance Through Caching)
    const streamPackets = (probe.packets as ProbePacket[]).filter(
      (p) => p.stream_index === videoStream.index,
    );
    const keyframeCount = streamPackets.filter((p) => p.flags?.includes("K")).length;
    const totalSampleCount = streamPackets.length;

    log(
      `Complete stream has ${streamPackets.length} video packets, ${keyframeCount} keyframes for stream ${videoStream.index}`,
    );

    // Calculate per-track timing offset from first packet for timeline mapping
    let trackStartTimeOffsetMs: number | undefined;
    if (streamPackets.length > 0) {
      log(
        `First video packet dts_time: ${streamPackets[0]!.dts_time}, pts_time: ${streamPackets[0]!.pts_time}`,
      );
      const presentationTime = streamPackets[0]!.pts_time;
      if (Math.abs(presentationTime) > 0.01) {
        trackStartTimeOffsetMs = presentationTime * MS_PER_SECOND;
      }
    }
    if (startTimeOffsetMs !== undefined) {
      trackStartTimeOffsetMs = startTimeOffsetMs;
    }

    // Process fragments to create segments with minimum duration
    const segments = processTrack(
      videoStream.index,
      "video",
      timebase,
      probe.packets as ProbePacket[],
    );

    // Calculate total duration from cached stream packets (inclusive of last frame duration)
    let totalDuration = 0;
    if (streamPackets.length > 0) {
      const firstPacket = streamPackets[0]!;
      const lastPacket = streamPackets[streamPackets.length - 1]!;
      const firstPts = convertTimestamp(firstPacket.pts, timebase, timescale);
      const lastPts = convertTimestamp(lastPacket.pts, timebase, timescale);
      const lastDuration = convertTimestamp(lastPacket.duration ?? 0, timebase, timescale);
      totalDuration = lastPts - firstPts + lastDuration;
    }

    const finalTrackId =
      trackIdMapping?.[videoStream.index] ?? videoStream.index + 1;
    trackIndexes[finalTrackId] = {
      track: finalTrackId,
      type: "video",
      width: videoStream.coded_width || videoStream.width,
      height: videoStream.coded_height || videoStream.height,
      timescale: timescale,
      sample_count: totalSampleCount,
      codec: constructH264CodecString(
        videoStream.codec_tag_string,
        videoStream.profile,
        videoStream.level,
      ),
      duration: totalDuration,
      startTimeOffsetMs: trackStartTimeOffsetMs,
      initSegment: {
        offset: 0,
        size: initFragment?.size || 0,
      },
      segments,
    };
  }

  // Step 5: Process audio tracks using ffprobe data
  for (const audioStream of audioStreams) {
    // Get timebase for this stream to convert timestamps
    const timebase = probe.audioTimebase;
    if (!timebase) {
      console.warn("No timebase found for audio stream");
      continue;
    }

    const timescale = Math.round(timebase.den / timebase.num);

    // Cache filtered packets once (Performance Through Caching)
    const streamPackets = (probe.packets as ProbePacket[]).filter(
      (p) => p.stream_index === audioStream.index,
    );
    const totalSampleCount = streamPackets.length;

    // Calculate per-track timing offset from first packet for timeline mapping
    let trackStartTimeOffsetMs: number | undefined;
    if (streamPackets.length > 0) {
      const presentationTime = streamPackets[0]!.pts_time;
      if (Math.abs(presentationTime) > 0.01) {
        trackStartTimeOffsetMs = presentationTime * MS_PER_SECOND;
      }
    }
    if (startTimeOffsetMs !== undefined) {
      trackStartTimeOffsetMs = startTimeOffsetMs;
    }

    // Process fragments to create segments with minimum duration
    const segments = processTrack(
      audioStream.index,
      "audio",
      timebase,
      probe.packets as ProbePacket[],
    );

    // Calculate total duration
    const totalDuration = segments.reduce((sum, seg) => sum + seg.duration, 0);

    const finalTrackId =
      trackIdMapping?.[audioStream.index] ?? audioStream.index + 1;
    trackIndexes[finalTrackId] = {
      track: finalTrackId,
      type: "audio",
      channel_count: audioStream.channels,
      sample_rate: Number(audioStream.sample_rate),
      sample_size: audioStream.bits_per_sample,
      sample_count: totalSampleCount,
      timescale: timescale,
      codec: audioStream.codec_tag_string || audioStream.codec_name || "",
      duration: totalDuration,
      startTimeOffsetMs: trackStartTimeOffsetMs,
      initSegment: {
        offset: 0,
        size: initFragment?.size || 0,
      },
      segments,
    };
  }

  return trackIndexes;
};
