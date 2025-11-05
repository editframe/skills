/**
 * TypeScript interface for the modular Filter component
 * Uses explicit resource management for automatic cleanup
 */

export interface FilterOptions {
  mediaType: 'video' | 'audio';
  filterDescription: string; // FFmpeg filter description (e.g., "scale=1280:720", "aresample=44100")

  // Input format specification
  inputWidth?: number;
  inputHeight?: number;
  inputPixelFormat?: number; // AVPixelFormat enum value
  inputChannels?: number;
  inputSampleRate?: number;
  inputSampleFormat?: number; // AVSampleFormat enum value
  inputTimeBase?: { num: number; den: number };

  // Output format specification (optional - filter will determine if not specified)
  outputWidth?: number;
  outputHeight?: number;
  outputPixelFormat?: number;
  outputChannels?: number;
  outputSampleRate?: number;
  outputSampleFormat?: number;

  // Audio frame buffering options for AAC compatibility
  enableAudioFrameBuffering?: boolean;
  targetAudioFrameSize?: number;
}

export interface FilteredFrame {
  readonly framePtr: number;  // Frame pointer for accessing actual frame data
  readonly pts: number;
  readonly dts: number;
  readonly format: number;
  readonly mediaType: 'video' | 'audio';

  // Video properties
  readonly width?: number;
  readonly height?: number;

  // Audio properties
  readonly channels?: number;
  readonly sampleRate?: number;
  readonly samplesPerChannel?: number;

  // Frame data planes
  readonly planes: ReadonlyArray<{
    readonly linesize: number;
  }>;
}

/**
 * Filter - A disposable resource for applying FFmpeg filters to frames
 * Automatically manages filter graphs and frame processing
 */
export interface Filter {
  readonly mediaType: 'video' | 'audio';
  readonly filterDescription: string;
  readonly isInitialized: boolean;

  /**
   * Apply filter to an input frame
   * @param frame Input frame to process
   * @returns Promise that resolves to array of filtered frames
   */
  filter(frame: FilterFrame): Promise<FilteredFrame[]>;

  /**
   * Apply filter to a frame using frame pointer reference
   * @param framePtr Frame pointer for accessing actual frame data
   * @returns Promise that resolves to array of filtered frames
   */
  filterFrame(framePtr: number): Promise<FilteredFrame[]>;

  /**
   * Flush remaining frames from the filter
   * @returns Promise that resolves to array of remaining filtered frames
   */
  flush(): Promise<FilteredFrame[]>;

  /**
   * Explicit resource cleanup - called automatically when using 'using' declaration
   */
  [Symbol.dispose](): void;
}

// Input frame format for filter (simplified for initial implementation)
export interface FilterFrame {
  readonly width?: number;
  readonly height?: number;
  readonly format?: number;
  readonly pts?: number;
  readonly channels?: number;
  readonly sampleRate?: number;
  readonly samplesPerChannel?: number;
}

// Common pixel formats (subset of AVPixelFormat)
export const PixelFormat = {
  YUV420P: 0,
  RGB24: 2,
  BGR24: 3,
  YUV422P: 4,
  YUV444P: 5,
  RGBA: 26,
  BGRA: 27,
  NV12: 23,
  NV21: 24
} as const;

// Common sample formats (subset of AVSampleFormat)
export const SampleFormat = {
  NONE: -1,
  U8: 0,
  S16: 1,
  S32: 2,
  FLT: 3,
  DBL: 4,
  U8P: 5,
  S16P: 6,
  S32P: 7,
  FLTP: 8,
  DBLP: 9
} as const;

/**
 * Factory function to create a Filter instance
 * The returned Filter can be used with 'using' declaration for automatic cleanup
 * 
 * @example
 * ```typescript
 * // Video scaling filter
 * using videoFilter = await createFilter({
 *   mediaType: 'video',
 *   filterDescription: 'scale=1280:720',
 *   inputWidth: 1920,
 *   inputHeight: 1080,
 *   inputPixelFormat: PixelFormat.YUV420P,
 *   outputPixelFormat: PixelFormat.YUV420P
 * });
 * 
 * // Audio resampling filter
 * using audioFilter = await createFilter({
 *   mediaType: 'audio', 
 *   filterDescription: 'aresample=44100',
 *   inputSampleRate: 48000,
 *   inputChannels: 2,
 *   outputSampleRate: 44100
 * });
 * 
 * const filteredFrames = await videoFilter.filter(inputFrame);
 * ```
 */
export async function createFilter(options: FilterOptions): Promise<Filter> {
  const { createFilterNative } = await import('../playback.js');

  const nativeFilter = createFilterNative(options);

  // Initialize the native filter
  const success = await nativeFilter.initialize();
  if (!success) {
    nativeFilter.dispose();
    throw new Error(`Failed to initialize Filter: ${options.filterDescription}`);
  }

  return {
    get mediaType() { return nativeFilter.mediaType; },
    get filterDescription() { return nativeFilter.filterDescription; },
    get isInitialized() { return nativeFilter.isInitialized; },

    async filter(frame: FilterFrame): Promise<FilteredFrame[]> {
      return nativeFilter.filter(frame);
    },

    async filterFrame(framePtr: number): Promise<FilteredFrame[]> {
      return nativeFilter.filterFrame(framePtr);
    },

    async flush(): Promise<FilteredFrame[]> {
      return nativeFilter.flush();
    },

    [Symbol.dispose](): void {
      nativeFilter.dispose();
    }
  };
}

/**
 * Convenience function to test Filter creation
 * Useful for debugging and validation
 */
export async function validateFilter(options: FilterOptions): Promise<{
  valid: boolean;
  error?: string;
  mediaType?: string;
  filterDescription?: string;
}> {
  try {
    using filter = await createFilter(options);

    return {
      valid: true,
      mediaType: filter.mediaType,
      filterDescription: filter.filterDescription
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
} 