/**
 * TypeScript interface for the Packet component
 * Wraps FFmpeg AVPacket for easier packet construction and management
 */

export interface PacketOptions {
  data: Uint8Array;
  pts?: number;
  dts?: number;
  duration?: number;
  streamIndex?: number;
  isKeyFrame?: boolean;
  pos?: number;
}

/**
 * Packet - A disposable resource for managing video/audio packet data
 * Wraps FFmpeg AVPacket with convenient TypeScript interface
 */
export interface Packet {
  readonly data: Uint8Array;
  readonly size: number;
  readonly pts: number;
  readonly dts: number;
  readonly duration: number;
  readonly streamIndex: number;
  readonly isKeyFrame: boolean;
  readonly pos: number;
  readonly isValid: boolean;

  /**
   * Update packet timing information
   * @param pts Presentation timestamp
   * @param dts Decode timestamp
   */
  setTimestamps(pts: number, dts?: number): void;

  /**
   * Update packet data with new raw bytes
   * @param data New packet data
   * @returns Success status
   */
  setData(data: Uint8Array): boolean;

  /**
   * Set the packet as a keyframe
   * @param isKeyFrame Whether this packet is a keyframe
   */
  setKeyFrame(isKeyFrame: boolean): void;

  /**
   * Set the stream index for this packet
   * @param streamIndex Stream index
   */
  setStreamIndex(streamIndex: number): void;

  /**
   * Set the duration for this packet
   * @param duration Duration in stream timebase units
   */
  setDuration(duration: number): void;

  /**
   * Set the position of this packet in the stream
   * @param pos Position in bytes
   */
  setPos(pos: number): void;

  /**
   * Create a deep copy of this packet
   * @returns New packet instance with copied data
   */
  clone(): Promise<Packet>;

  /**
   * Explicit resource cleanup - called automatically when using 'using' declaration
   */
  [Symbol.dispose](): void;
}

/**
 * Factory function to create a Packet instance from raw sample data
 * The returned Packet can be used with 'using' declaration for automatic cleanup
 * 
 * @example
 * ```typescript
 * const sampleData = new Uint8Array([]);
 * using packet = await createPacket({
 *   data: sampleData,
 *   pts: 1000,
 *   dts: 1000,
 *   isKeyFrame: true
 * });
 * 
 * // Use packet with decoder
 * const frames = await decoder.decode(packet);
 * ```
 */
export async function createPacket(options: PacketOptions): Promise<Packet> {
  const { createPacketNative } = await import('../playback.js');

  const nativePacket = createPacketNative({
    data: options.data,
    pts: options.pts ?? -1, // AV_NOPTS_VALUE equivalent
    dts: options.dts ?? -1,
    duration: options.duration ?? 0,
    streamIndex: options.streamIndex ?? 0,
    isKeyFrame: options.isKeyFrame ?? false,
    pos: options.pos ?? -1
  });

  return {
    get data() { return nativePacket.data; },
    get size() { return nativePacket.size; },
    get pts() { return nativePacket.pts; },
    get dts() { return nativePacket.dts; },
    get duration() { return nativePacket.duration; },
    get streamIndex() { return nativePacket.streamIndex; },
    get isKeyFrame() { return nativePacket.isKeyFrame; },
    get pos() { return nativePacket.pos; },
    get isValid() { return nativePacket.isValid; },

    setTimestamps(pts: number, dts?: number): void {
      nativePacket.setPts(pts);
      if (dts !== undefined) {
        nativePacket.setDts(dts);
      }
    },

    setData(data: Uint8Array): boolean {
      return nativePacket.setData(data);
    },

    setKeyFrame(isKeyFrame: boolean): void {
      nativePacket.setKeyFrame(isKeyFrame);
    },

    setStreamIndex(streamIndex: number): void {
      nativePacket.setStreamIndex(streamIndex);
    },

    setDuration(duration: number): void {
      nativePacket.setDuration(duration);
    },

    setPos(pos: number): void {
      nativePacket.setPos(pos);
    },

    async clone(): Promise<Packet> {
      const clonedNative = await nativePacket.clone();
      // Return wrapped clone with same interface
      return createPacket({
        data: clonedNative.data,
        pts: clonedNative.pts,
        dts: clonedNative.dts,
        duration: clonedNative.duration,
        streamIndex: clonedNative.streamIndex,
        isKeyFrame: clonedNative.isKeyFrame,
        pos: clonedNative.pos
      });
    },

    [Symbol.dispose](): void {
      nativePacket.dispose();
    }
  };
}

/**
 * Convenience function to create a packet from raw sample data with minimal options
 * 
 * @example
 * ```typescript
 * const sampleData = new Uint8Array([]);
 * using packet = await createPacketFromSample(sampleData, 1000, 1000, true);
 * ```
 */
export async function createPacketFromSample(
  data: Uint8Array,
  pts: number = -1,
  dts: number = -1,
  isKeyFrame: boolean = false
): Promise<Packet> {
  return createPacket({
    data,
    pts,
    dts,
    isKeyFrame
  });
}

/**
 * Utility function to validate packet creation
 * Useful for debugging packet construction issues
 */
export async function validatePacket(options: PacketOptions): Promise<{
  valid: boolean;
  error?: string;
  size?: number;
}> {
  try {
    using packet = await createPacket(options);

    return {
      valid: packet.isValid,
      size: packet.size
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
} 