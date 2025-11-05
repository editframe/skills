/**
 * TypeScript interface for the modular VideoSource component
 * Uses explicit resource management for automatic cleanup
 */

export interface VideoStreamInfo {
  readonly index: number;
  readonly duration: number;
  readonly durationMs: number;
  readonly codecType: 'video' | 'audio' | 'subtitle' | 'other';
  readonly codecId: number;
  readonly codecName: string;

  // Video specific properties
  readonly width?: number;
  readonly height?: number;
  readonly pixelFormat?: string;
  readonly frameRate?: { num: number; den: number };

  // Audio specific properties
  readonly channels?: number;
  readonly sampleRate?: number;
  readonly sampleFormat?: string;

  readonly timeBase: { num: number; den: number };

  // Codec-specific data (e.g., SPS/PPS for H.264)
  readonly extradata?: Uint8Array;
}

export interface VideoSourceOptions {
  url: string;
  syntheticMp4?: ArrayBufferLike;
  segmentData?: ArrayBufferLike;
}

export interface ByteRange {
  readonly startByte: number;
  readonly endByte: number;
}

export interface ByteRangeWithExpandedTime extends ByteRange {
  readonly expandedStartTimeMs: number;
  readonly expandedEndTimeMs: number;
}

export interface ByteRangeWithExpandedTime extends ByteRange {
  readonly expandedStartTimeMs: number;
  readonly expandedEndTimeMs: number;
}

export interface SampleTableEntry {
  readonly dts: number;              // Decode timestamp (DTS) in stream time base
  readonly dtsMs: number;            // Decode timestamp (DTS) in milliseconds
  readonly pos: number;              // Byte position in file
  readonly size: number;             // Size in bytes
  readonly isKeyframe: boolean;      // Whether this is a keyframe
  readonly flags: number;            // Raw FFmpeg index entry flags
}

/**
 * Result from unified keyframe-based fetching that eliminates timing mismatches
 * This ensures byte range and sample table entries come from the exact same keyframe search
 */
export interface KeyframeAlignedResult {
  readonly startByte: number;                        // Starting byte position
  readonly endByte: number;                          // Ending byte position
  readonly expandedStartTimeMs: number;              // Actual start time (may be earlier due to keyframe)
  readonly expandedEndTimeMs: number;                // Actual end time
  readonly sampleTableEntries: SampleTableEntry[];  // Sample entries from exact keyframe range
}

export interface Packet {
  readonly streamIndex: number;
  readonly data: Uint8Array;
  readonly pts: number;
  readonly dts: number;
  readonly duration: number;
  readonly size: number;
  readonly isKeyFrame: boolean;
}

/**
 * VideoSource - A disposable resource for reading video files
 * Automatically manages FFmpeg format contexts and custom I/O
 */
export interface VideoSource {
  readonly url: string;
  readonly durationMs: number;
  readonly streams: ReadonlyArray<VideoStreamInfo>;

  /**
   * Set a filter to only read packets from streams of a specific type
   * @param mediaType The type of media to filter for ('video', 'audio', 'subtitle', or null for no filter)
   */
  setStreamFilter(mediaType: 'video' | 'audio' | 'subtitle' | null): void;

  /**
   * Seek to a specific time position
   * @param timeMs Time in milliseconds
   * @returns Promise that resolves to true if seek was successful
   */
  seek(timeMs: number): Promise<boolean>;

  /**
   * Read the next packet from the source
   * @returns Promise that resolves to the next packet, or null if EOF
   */
  readPacket(): Promise<Packet | null>;

  /**
   * Check if this VideoSource can read packet data
   * Returns false for synthetic MP4 sources (metadata only)
   */
  readonly canReadPackets: boolean;

  /**
   * Find the byte range that contains frames for the specified time range
   * @param startTimeMs Start time in milliseconds
   * @param endTimeMs End time in milliseconds
   * @returns Byte range object with expanded time range, or null if not found
   */
  findByteRangeForTimeRange(startTimeMs: number, endTimeMs: number): ByteRangeWithExpandedTime;

  /**
   * Get sample table entries for a specific stream within a time range
   * 
   * IMPORTANT: This function automatically backtracks to include the closest keyframe 
   * before the requested start time. This is essential for video decoding since 
   * non-keyframes depend on previous keyframes for proper decompression.
   * 
   * NOTE: Returns DTS (Decode Time Stamps) from the container's sample table.
   * For PTS (Presentation Time Stamps), you need to read actual packets using readPacket().
   * 
   * @param streamIndex The index of the stream to query
   * @param startTimeMs Start time in milliseconds (actual start may be earlier due to keyframe backtrack)
   * @param endTimeMs End time in milliseconds
   * @returns Array of sample table entries from the preceding keyframe to the end time
   * 
   * @example
   * ```typescript
   * // Request entries from 2500ms to 5000ms
   * // If closest keyframe is at 2000ms, entries will start from 2000ms
   * const entries = source.getSampleTableEntries(0, 2500, 5000);
   * console.log(`First entry DTS: ${entries[0].dtsMs}ms (may be < 2500ms due to keyframe backtrack)`);
   * ```
   */
  getSampleTableEntries(streamIndex: number, startTimeMs: number, endTimeMs: number): SampleTableEntry[];

  /**
   * CRITICAL FIX: Get keyframe-aligned data that matches FFmpeg's approach exactly
   * 
   * This method does ONE keyframe search and returns both byte range and sample table entries,
   * eliminating the timing mismatch between separate searches that caused sample count differences.
   * 
   * This is equivalent to FFmpeg's av_index_search_timestamp() + processing from keyframe boundaries.
   * 
   * @param streamIndex The index of the stream to query
   * @param startTimeMs Start time in milliseconds
   * @param endTimeMs End time in milliseconds 
   * @returns Unified result with byte range and sample table entries from same keyframe search
   * 
   * @example
   * ```typescript
   * // Get unified data that guarantees consistency between byte range and sample table
   * const result = source.findKeyframeAlignedData(0, 2500, 5000);
   * // result.startByte/endByte corresponds exactly to result.sampleTableEntries
   * console.log(`Fetching bytes ${result.startByte}-${result.endByte} gives exactly ${result.sampleTableEntries.length} samples`);
   * ```
   */
  findKeyframeAlignedData(streamIndex: number, startTimeMs: number, endTimeMs: number): KeyframeAlignedResult;

  /**
   * Check if this VideoSource has index entries available for time range analysis
   * @returns true if index entries are available
   */
  readonly hasIndexEntries: boolean;

  /**
   * Explicit resource cleanup - called automatically when using 'using' declaration
   */
  [Symbol.dispose](): void;
}

/**
 * Factory function to create a VideoSource instance
 * The returned VideoSource can be used with 'using' declaration for automatic cleanup
 * 
 * @example
 * ```typescript
 * using source = await createVideoSource({ 
 *   url: 'https://example.com/video.mp4',
 *   syntheticMp4: fakeMp4Buffer 
 * });
 * 
 * await source.seek(1000); // Seek to 1 second
 * const packet = await source.readPacket();
 * ```
 */
export async function createVideoSource(options: VideoSourceOptions): Promise<VideoSource> {
  const { createVideoSourceNative } = await import('../playback.js');

  // Convert ArrayBufferLike to Uint8Array if provided
  let syntheticMp4 = options.syntheticMp4 ?
    new Uint8Array(options.syntheticMp4) :
    undefined;

  const segmentData = options.segmentData ?
    new Uint8Array(options.segmentData) :
    undefined;

  // For remote URLs, use synthetic MP4 approach to avoid FFmpeg network requests
  // IMPLEMENTATION GUIDELINES: Never let FFmpeg make direct network requests as they can hang
  // indefinitely without proper timeout handling. Instead, use our controlled fetch mechanism
  // to get just the ftyp and moov boxes, then create synthetic MP4 for metadata extraction.
  let useSyntheticMp4 = !!syntheticMp4;

  if (!syntheticMp4 && !segmentData && isRemoteUrl(options.url)) {
    console.log(`[VideoSource] Remote URL detected, fetching metadata: ${options.url}`);

    try {
      // Use existing infrastructure to fetch ftyp and moov boxes
      const { fetchMoovAndFtyp, buildFakeMp4 } = await import('../moovScanner');
      const moovResult = await fetchMoovAndFtyp(options.url);

      if (!moovResult.ftyp || !moovResult.moov) {
        throw new Error(`Failed to fetch video metadata for: ${options.url}`);
      }

      // Create synthetic MP4 with ftyp + moov + dummy mdat
      const fakeMp4 = buildFakeMp4(moovResult.ftyp, moovResult.moov);
      syntheticMp4 = fakeMp4;
      useSyntheticMp4 = true;

      console.log(`[VideoSource] Created synthetic MP4 (${fakeMp4.length} bytes) for: ${options.url}`);
    } catch (error) {
      console.error(`[VideoSource] Failed to create synthetic MP4 for ${options.url}:`, error);
      throw error;
    }
  }

  const nativeSource = createVideoSourceNative({
    url: options.url,
    syntheticMp4,
    useSyntheticMp4,
    segmentData,
    useSegmentData: !!segmentData
  });

  // Initialize the native source - throws on failure
  await new Promise<void>((resolve, reject) => {
    nativeSource.initializeAsync((error: Error | null, result: boolean) => {
      if (error) {
        reject(error);
      } else if (!result) {
        reject(new Error(`Failed to initialize VideoSource for ${options.url}`));
      } else {
        resolve();
      }
    });
  });

  return {
    get url() { return nativeSource.url; },
    get durationMs() { return nativeSource.durationMs; },
    get streams() { return nativeSource.streams; },
    get canReadPackets() { return nativeSource.canReadPackets; },
    get hasIndexEntries() { return nativeSource.hasIndexEntries; },

    setStreamFilter(mediaType: 'video' | 'audio' | 'subtitle' | null): void {
      const mediaTypeMap = {
        'video': 0,    // AVMEDIA_TYPE_VIDEO
        'audio': 1,    // AVMEDIA_TYPE_AUDIO
        'subtitle': 3, // AVMEDIA_TYPE_SUBTITLE
        'null': -1     // AVMEDIA_TYPE_UNKNOWN
      };
      nativeSource.setStreamFilter(mediaType === null ? -1 : mediaTypeMap[mediaType]);
    },

    async seek(timeMs: number): Promise<boolean> {
      return nativeSource.seek(timeMs);
    },

    async readPacket(): Promise<Packet | null> {
      return new Promise<Packet | null>((resolve, reject) => {
        nativeSource.readPacketAsync((error: Error | null, packet: Packet | null) => {
          if (error) {
            reject(error);
          } else {
            resolve(packet);
          }
        });
      });
    },

    findByteRangeForTimeRange(startTimeMs: number, endTimeMs: number): ByteRangeWithExpandedTime {
      const result = nativeSource.findByteRangeForTimeRange(startTimeMs, endTimeMs);
      if (!result) {
        throw new Error('Failed to find byte range for time range (TS)');
      }
      return result as ByteRangeWithExpandedTime;
    },

    getSampleTableEntries(streamIndex: number, startTimeMs: number, endTimeMs: number): SampleTableEntry[] {
      return nativeSource.getSampleTableEntries(streamIndex, startTimeMs, endTimeMs);
    },

    findKeyframeAlignedData(streamIndex: number, startTimeMs: number, endTimeMs: number): KeyframeAlignedResult {
      const result = nativeSource.findKeyframeAlignedData(streamIndex, startTimeMs, endTimeMs);
      if (!result) {
        throw new Error('Failed to find keyframe aligned data');
      }
      return result as KeyframeAlignedResult;
    },

    [Symbol.dispose](): void {
      nativeSource.dispose();
    }
  };
}

/**
 * Helper function to detect if a URL is remote (HTTP/HTTPS)
 */
function isRemoteUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

/**
 * Convenience function to test VideoSource creation
 * Useful for debugging and validation
 */
export async function validateVideoSource(options: VideoSourceOptions): Promise<{
  valid: boolean;
  error?: string;
  streams?: ReadonlyArray<VideoStreamInfo>;
  durationMs?: number;
}> {
  try {
    using source = await createVideoSource(options);

    return {
      valid: true,
      streams: source.streams,
      durationMs: source.durationMs
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
} 