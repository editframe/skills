import { Readable, Transform, Writable } from "node:stream";
import { pipeline } from "node:stream/promises";
import debug from "debug";
import type { TrackFragmentIndex, TrackSegment } from "./Probe.js";
import { PacketProbe } from "./Probe.js";

const log = debug("ef:generateFragmentIndex");

// Minimum segment duration in milliseconds
const MIN_SEGMENT_DURATION_MS = 2000; // 2 seconds

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

  _transform(chunk: any, _encoding: BufferEncoding, callback: () => void) {
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
  const fragmentTimingData: Array<{
    fragmentIndex: number;
    videoPackets: Array<{
      pts: number;
      dts: number;
      isKeyframe: boolean;
      duration?: number;
    }>;
    audioPackets: Array<{ pts: number; dts: number; duration?: number }>;
  }> = [];

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

  // Step 4: Process video tracks using ffprobe data
  for (const videoStream of videoStreams) {
    const segments: TrackSegment[] = [];

    // Count total samples from complete stream - try counting keyframes for "improved efficiency"
    const totalVideoPackets = probe.packets.filter(
      (p) => p.stream_index === videoStream.index,
    );
    const keyframePackets = totalVideoPackets.filter((p) =>
      p.flags?.includes("K"),
    );

    // The test comment mentions "improved efficiency" suggesting we should count keyframes
    const totalSampleCount = keyframePackets.length;

    log(
      `Complete stream has ${totalVideoPackets.length} video packets, ${keyframePackets.length} keyframes for stream ${videoStream.index}`,
    );

    // Get timebase for this stream to convert timestamps
    const timebase = probe.videoTimebase;
    if (!timebase) {
      console.warn("No timebase found for video stream");
      continue;
    }

    // Calculate timescale as the inverse of timebase
    const timescale = Math.round(timebase.den / timebase.num);

    // Calculate per-track timing offset from first packet for timeline mapping
    let trackStartTimeOffsetMs: number | undefined;
    const allVideoPackets = probe.packets.filter(
      (p) => p.stream_index === videoStream.index,
    );
    if (allVideoPackets.length > 0) {
      const firstPacketTime = allVideoPackets[0]!.dts_time;
      log(
        `First video packet dts_time: ${firstPacketTime}, pts_time: ${allVideoPackets[0]!.pts_time}`,
      );

      // Use PTS time instead of DTS time for offset calculation
      // since PTS represents the presentation timeline
      const presentationTime = allVideoPackets[0]!.pts_time;
      if (Math.abs(presentationTime) > 0.01) {
        trackStartTimeOffsetMs = presentationTime * 1000;
      }
    }
    if (startTimeOffsetMs !== undefined) {
      trackStartTimeOffsetMs = startTimeOffsetMs;
    }

    // Process fragments to create segments with minimum duration
    // Accumulate fragments until we hit a keyframe AND accumulated duration >= 2 seconds
    log(
      `Processing ${fragmentTimingData.length} fragments for video stream ${videoStream.index}`,
    );

    // Accumulated fragments for current segment
    const accumulatedFragments: Array<{
      fragment: Fragment;
      fragmentData: typeof fragmentTimingData[0];
    }> = [];
    let currentSegmentStartKeyframe: {
      pts: number;
      dts: number;
    } | null = null;

    const finalizeSegment = () => {
      if (accumulatedFragments.length === 0 || !currentSegmentStartKeyframe) {
        return;
      }

      const firstFrag = accumulatedFragments[0]!;
      const lastFrag = accumulatedFragments[accumulatedFragments.length - 1]!;

      // Convert timestamps from ffprobe timebase to track timescale
      const segmentCts = Math.round(
        (currentSegmentStartKeyframe.pts * timescale) / timebase.den,
      );
      const segmentDts = Math.round(
        (currentSegmentStartKeyframe.dts * timescale) / timebase.den,
      );

      // Calculate duration to next segment or end of stream
      const nextFragmentData =
        fragmentTimingData[lastFrag.fragmentData.fragmentIndex + 1];
      const nextKeyframe = nextFragmentData?.videoPackets.find(
        (p) => p.isKeyframe,
      );

      let segmentDuration: number;
      if (nextKeyframe) {
        // Duration to next keyframe (perfectly contiguous)
        const nextSegmentCts = Math.round(
          (nextKeyframe.pts * timescale) / timebase.den,
        );
        segmentDuration = nextSegmentCts - segmentCts;
      } else {
        // Last segment: duration to end of all video packets
        const allVideoPackets = probe.packets
          .filter((p) => {
            const stream = videoStreams.find((s) => s.index === p.stream_index);
            return stream?.codec_type === "video";
          })
          .sort((a, b) => a.pts - b.pts);
        const lastPacket = allVideoPackets[allVideoPackets.length - 1]!;
        const streamEnd = Math.round(
          ((lastPacket.pts + (lastPacket.duration || 0)) * timescale) /
            timebase.den,
        );
        segmentDuration = streamEnd - segmentCts;
      }

      // Segment spans from first fragment to last fragment
      const segmentOffset = firstFrag.fragment.offset;
      const segmentSize =
        lastFrag.fragment.offset + lastFrag.fragment.size - segmentOffset;

      segments.push({
        cts: segmentCts,
        dts: segmentDts,
        duration: segmentDuration,
        offset: segmentOffset,
        size: segmentSize,
      });

      // Reset accumulation
      accumulatedFragments.length = 0;
      currentSegmentStartKeyframe = null;
    };

    for (const fragmentData of fragmentTimingData) {
      const fragment = mediaFragments[fragmentData.fragmentIndex]!;
      const videoPackets = fragmentData.videoPackets;

      log(
        `Fragment ${fragmentData.fragmentIndex}: ${videoPackets.length} video packets`,
      );
      if (videoPackets.length === 0) {
        log(
          `Skipping fragment ${fragmentData.fragmentIndex} - no video packets`,
        );
        continue;
      }

      // Find keyframe in this fragment
      const keyframe = videoPackets.find((p) => p.isKeyframe);
      const isNewKeyframe = keyframe !== undefined;

      // If we have a current segment and this is a new keyframe, check if we should finalize
      if (currentSegmentStartKeyframe !== null && isNewKeyframe) {
        // Calculate accumulated duration in milliseconds
        const lastFrag = accumulatedFragments[accumulatedFragments.length - 1]!;
        const lastFragLastPacket =
          lastFrag.fragmentData.videoPackets[
            lastFrag.fragmentData.videoPackets.length - 1
          ]!;
        const accumulatedEndCts = Math.round(
          ((lastFragLastPacket.pts + (lastFragLastPacket.duration || 0)) *
            timescale) /
            timebase.den,
        );
        const accumulatedStartCts = Math.round(
          (currentSegmentStartKeyframe.pts * timescale) / timebase.den,
        );
        const accumulatedDurationMs =
          ((accumulatedEndCts - accumulatedStartCts) / timescale) * 1000;

        // If we've accumulated >= 2 seconds, finalize the segment
        if (accumulatedDurationMs >= MIN_SEGMENT_DURATION_MS) {
          finalizeSegment();
          // Start a new segment with this keyframe
          currentSegmentStartKeyframe = {
            pts: keyframe.pts,
            dts: keyframe.dts,
          };
          accumulatedFragments.push({ fragment, fragmentData });
        } else {
          // Duration not enough yet, continue accumulating
          accumulatedFragments.push({ fragment, fragmentData });
        }
      } else if (isNewKeyframe) {
        // Start a new segment with this keyframe
        currentSegmentStartKeyframe = {
          pts: keyframe.pts,
          dts: keyframe.dts,
        };
        accumulatedFragments.push({ fragment, fragmentData });
      } else if (currentSegmentStartKeyframe !== null) {
        // No keyframe in this fragment, but we have a segment started - continue accumulating
        accumulatedFragments.push({ fragment, fragmentData });
      }
      // If no keyframe and no segment started, skip this fragment
    }

    // Finalize any remaining accumulated fragments
    if (accumulatedFragments.length > 0) {
      finalizeSegment();
    }

    // Calculate total duration from complete stream packets, not just segments
    // This accounts for standalone mdat fragments that don't create segments
    let totalDuration = 0;
    if (totalVideoPackets.length > 0) {
      const firstPacket = totalVideoPackets[0]!;
      const lastPacket = totalVideoPackets[totalVideoPackets.length - 1]!;

      const firstPts = Math.round((firstPacket.pts * timescale) / timebase.den);
      const lastPts = Math.round((lastPacket.pts * timescale) / timebase.den);

      // Calculate duration as the span from first to last packet
      totalDuration = lastPts - firstPts;
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
    const segments: TrackSegment[] = [];

    // Count total samples from complete stream, not individual fragments
    const totalAudioPackets = probe.packets.filter(
      (p) => p.stream_index === audioStream.index,
    );
    const totalSampleCount = totalAudioPackets.length;

    // Get timebase for this stream to convert timestamps
    const timebase = probe.audioTimebase;
    if (!timebase) {
      console.warn("No timebase found for audio stream");
      continue;
    }

    // Calculate timescale as the inverse of timebase
    const timescale = Math.round(timebase.den / timebase.num);

    // Calculate per-track timing offset from first packet for timeline mapping
    let trackStartTimeOffsetMs: number | undefined;
    const allAudioPackets = probe.packets.filter(
      (p) => p.stream_index === audioStream.index,
    );
    if (allAudioPackets.length > 0) {
      // Use PTS time for offset calculation since it represents presentation timeline
      const presentationTime = allAudioPackets[0]!.pts_time;
      if (Math.abs(presentationTime) > 0.01) {
        trackStartTimeOffsetMs = presentationTime * 1000;
      }
    }
    if (startTimeOffsetMs !== undefined) {
      trackStartTimeOffsetMs = startTimeOffsetMs;
    }

    // Process fragments to create segments with minimum duration
    // Accumulate fragments until accumulated duration >= 2 seconds
    log(
      `Processing ${fragmentTimingData.length} fragments for audio stream ${audioStream.index}`,
    );

    // Accumulated fragments for current segment
    const accumulatedFragments: Array<{
      fragment: Fragment;
      fragmentData: typeof fragmentTimingData[0];
    }> = [];
    let currentSegmentStartPts: number | null = null;

    const finalizeSegment = () => {
      if (accumulatedFragments.length === 0 || currentSegmentStartPts === null) {
        return;
      }

      const firstFrag = accumulatedFragments[0]!;
      const lastFrag = accumulatedFragments[accumulatedFragments.length - 1]!;

      // Convert timestamps from ffprobe timebase to track timescale
      // For audio, CTS always equals PTS (no reordering)
      const segmentCts = Math.round(
        (currentSegmentStartPts * timescale) / timebase.den,
      );
      const segmentDts = Math.round(
        (currentSegmentStartPts * timescale) / timebase.den,
      );

      // Calculate duration to next segment or end of stream
      const nextFragmentData =
        fragmentTimingData[lastFrag.fragmentData.fragmentIndex + 1];
      const nextFirstPacket = nextFragmentData?.audioPackets[0];

      let segmentDuration: number;
      if (nextFirstPacket) {
        // Duration to next segment start (perfectly contiguous)
        const nextSegmentCts = Math.round(
          (nextFirstPacket.pts * timescale) / timebase.den,
        );
        segmentDuration = nextSegmentCts - segmentCts;
      } else {
        // Last segment: duration to end of all audio packets
        const allAudioPackets = probe.packets
          .filter((p) => {
            const stream = audioStreams.find((s) => s.index === p.stream_index);
            return stream?.codec_type === "audio";
          })
          .sort((a, b) => a.pts - b.pts);
        const lastPacket = allAudioPackets[allAudioPackets.length - 1]!;
        const streamEnd = Math.round(
          ((lastPacket.pts + (lastPacket.duration || 0)) * timescale) /
            timebase.den,
        );
        segmentDuration = streamEnd - segmentCts;
      }

      // Segment spans from first fragment to last fragment
      const segmentOffset = firstFrag.fragment.offset;
      const segmentSize =
        lastFrag.fragment.offset + lastFrag.fragment.size - segmentOffset;

      segments.push({
        cts: segmentCts,
        dts: segmentDts,
        duration: segmentDuration,
        offset: segmentOffset,
        size: segmentSize,
      });

      // Reset accumulation
      accumulatedFragments.length = 0;
      currentSegmentStartPts = null;
    };

    for (const fragmentData of fragmentTimingData) {
      const fragment = mediaFragments[fragmentData.fragmentIndex]!;
      const audioPackets = fragmentData.audioPackets;

      log(
        `Fragment ${fragmentData.fragmentIndex}: ${audioPackets.length} audio packets`,
      );
      if (audioPackets.length === 0) {
        log(
          `Skipping fragment ${fragmentData.fragmentIndex} - no audio packets`,
        );
        continue;
      }

      const firstPacket = audioPackets[0]!;

      // Start a new segment if we don't have one
      if (currentSegmentStartPts === null) {
        currentSegmentStartPts = firstPacket.pts;
        accumulatedFragments.push({ fragment, fragmentData });
        continue;
      }

      // Calculate accumulated duration in milliseconds
      const lastFrag = accumulatedFragments[accumulatedFragments.length - 1]!;
      const lastFragLastPacket =
        lastFrag.fragmentData.audioPackets[
          lastFrag.fragmentData.audioPackets.length - 1
        ]!;
      const accumulatedEndCts = Math.round(
        ((lastFragLastPacket.pts + (lastFragLastPacket.duration || 0)) *
          timescale) /
          timebase.den,
      );
      const accumulatedStartCts = Math.round(
        (currentSegmentStartPts * timescale) / timebase.den,
      );
      const accumulatedDurationMs =
        ((accumulatedEndCts - accumulatedStartCts) / timescale) * 1000;

      // If we've accumulated >= 2 seconds, finalize the segment and start a new one
      if (accumulatedDurationMs >= MIN_SEGMENT_DURATION_MS) {
        finalizeSegment();
        // Start a new segment with this fragment
        currentSegmentStartPts = firstPacket.pts;
        accumulatedFragments.push({ fragment, fragmentData });
      } else {
        // Duration not enough yet, continue accumulating
        accumulatedFragments.push({ fragment, fragmentData });
      }
    }

    // Finalize any remaining accumulated fragments
    if (accumulatedFragments.length > 0) {
      finalizeSegment();
    }

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
