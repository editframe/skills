export interface ValidationResult {
  success: boolean;
  message?: string;
  details?: {
    initMetadata?: {
      hasVideoTrack: boolean;
      isFragmented: boolean;
      videoCodec?: string;
    };
    fragmentTimings?: Array<{
      startTime: number;
      duration: number;
    }>;
    frameDrops?: number;
    timeGaps?: number;
    maxGapMs?: number;
    audioGaps?: number;
    waveformContinuity?: boolean;
    consistentSampleRate?: boolean;
    sampleRate?: number;
  };
}

/**
 * Extract video metadata from a buffer
 */
export async function extractVideoMetadata(buffer: Buffer): Promise<any> {
  // Basic mock implementation - in a real scenario this would use ffprobe or similar
  return {
    duration: 1000,
    width: 1920,
    height: 1080,
    fps: 30,
    codec: "h264",
  };
}

/**
 * Validate init segment structure
 */
export async function validateInitSegment(
  buffer: Buffer,
  expectedCodec: string,
): Promise<ValidationResult> {
  // Basic validation - check if buffer exists and has content
  if (!buffer || buffer.length === 0) {
    return {
      success: false,
      message: "Init segment buffer is empty",
    };
  }

  // Mock validation based on buffer content
  const bufferString = buffer.toString();

  if (bufferString.includes("invalid")) {
    return {
      success: false,
      message: "Init segment missing video track",
    };
  }

  return {
    success: true,
    details: {
      initMetadata: {
        hasVideoTrack: true,
        isFragmented: true,
        videoCodec: expectedCodec,
      },
    },
  };
}

/**
 * Validate fragment timing accuracy
 */
export async function validateFragmentTiming(
  fragments: Buffer[],
  expectedWorkSliceMs: number,
  toleranceMs: number = 100,
): Promise<ValidationResult> {
  if (!fragments || fragments.length === 0) {
    return {
      success: false,
      message: "No fragments provided",
    };
  }

  const fragmentTimings = fragments.map((fragment, index) => {
    // Extract duration from mock fragment (in real implementation would analyze MP4)
    const fragmentString = fragment.toString();
    const durationMatch = fragmentString.match(/(\d+)ms/);
    const duration = durationMatch
      ? parseInt(durationMatch[1])
      : expectedWorkSliceMs;

    return {
      startTime: index * expectedWorkSliceMs,
      duration,
    };
  });

  // Check if any fragment duration differs too much from expected
  for (let i = 0; i < fragmentTimings.length; i++) {
    const timing = fragmentTimings[i];
    const difference = Math.abs(timing.duration - expectedWorkSliceMs);

    // Allow final fragment to be shorter
    const isFinalFragment = i === fragmentTimings.length - 1;
    if (!isFinalFragment && difference > toleranceMs) {
      return {
        success: false,
        message: `Fragment ${i} duration ${timing.duration}ms differs from expected ${expectedWorkSliceMs}ms by ${difference}ms`,
      };
    }
  }

  return {
    success: true,
    details: {
      fragmentTimings,
    },
  };
}
