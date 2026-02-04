import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

export interface MP4ValidationResult {
  isValid: boolean;
  hasVideoTrack: boolean;
  hasAudioTrack: boolean;
  duration: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
  errors: string[];
}

export interface PlaybackTestResult {
  canPlay: boolean;
  duration: number;
  error?: string;
}

/**
 * Validate MP4 file structure and metadata
 */
export function validateMP4(videoPathOrBuffer: string | Buffer): MP4ValidationResult {
  const result: MP4ValidationResult = {
    isValid: false,
    hasVideoTrack: false,
    hasAudioTrack: false,
    duration: 0,
    width: 0,
    height: 0,
    fps: 0,
    codec: "",
    errors: [],
  };

  try {
    // If buffer, check for MP4 signature
    if (Buffer.isBuffer(videoPathOrBuffer)) {
      const buffer = videoPathOrBuffer;
      
      // Check for ftyp box (MP4 signature)
      if (buffer.length < 8) {
        result.errors.push("Buffer too small to be valid MP4");
        return result;
      }

      const ftypCheck =
        buffer.subarray(4, 8).toString() === "ftyp" ||
        buffer.subarray(4, 12).toString() === "ftypiso5" ||
        buffer.subarray(4, 12).toString() === "ftypisom";

      if (!ftypCheck) {
        result.errors.push("Missing ftyp box - not a valid MP4");
        return result;
      }

      // Check for required boxes
      const hasMovBox = buffer.includes(Buffer.from("moov")) || buffer.includes(Buffer.from("moof"));
      const hasMdatBox = buffer.includes(Buffer.from("mdat"));

      if (!hasMovBox) {
        result.errors.push("Missing moov/moof box");
      }
      if (!hasMdatBox) {
        result.errors.push("Missing mdat box");
      }

      result.isValid = ftypCheck && hasMovBox && hasMdatBox;
      
      // Can't get detailed info from buffer without writing to file
      // So just return basic validation
      return result;
    }

    // If path, use ffprobe for detailed analysis
    const videoPath = videoPathOrBuffer;
    const output = execSync(
      `ffprobe -v quiet -print_format json -show_streams -show_format "${videoPath}"`,
      { encoding: "utf8" },
    );

    const data = JSON.parse(output);

    if (!data.streams || data.streams.length === 0) {
      result.errors.push("No streams found");
      return result;
    }

    // Check for video track
    const videoStream = data.streams.find(
      (s: any) => s.codec_type === "video",
    );
    if (videoStream) {
      result.hasVideoTrack = true;
      result.width = videoStream.width || 0;
      result.height = videoStream.height || 0;
      result.codec = videoStream.codec_name || "";

      // Parse fps
      if (videoStream.r_frame_rate) {
        const parts = videoStream.r_frame_rate.split("/");
        const num = parseFloat(parts[0] || "30");
        const den = parseFloat(parts[1] || "1");
        result.fps = num / den;
      }
    }

    // Check for audio track
    const audioStream = data.streams.find(
      (s: any) => s.codec_type === "audio",
    );
    if (audioStream) {
      result.hasAudioTrack = true;
    }

    // Get duration
    if (data.format && data.format.duration) {
      result.duration = parseFloat(data.format.duration);
    }

    // Valid if we have at least one track
    result.isValid = result.hasVideoTrack || result.hasAudioTrack;

    if (!result.hasVideoTrack) {
      result.errors.push("No video track found");
    }

    return result;
  } catch (error) {
    result.errors.push(
      `Validation error: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    return result;
  }
}

/**
 * Test if video can be played (basic playback check)
 */
export function testPlayback(videoPath: string): PlaybackTestResult {
  try {
    // Try to decode a few frames to verify playback works
    execSync(
      `ffmpeg -v error -i "${videoPath}" -t 1 -f null - 2>&1`,
      { encoding: "utf8", stdio: "pipe" },
    );

    // Get duration
    const output = execSync(
      `ffprobe -v quiet -print_format json -show_format "${videoPath}"`,
      { encoding: "utf8" },
    );
    const data = JSON.parse(output);
    const duration = parseFloat(data.format?.duration || "0");

    return {
      canPlay: true,
      duration,
    };
  } catch (error) {
    return {
      canPlay: false,
      duration: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check if MP4 has correct fragmented structure
 */
export function validateFragmentedMP4(videoPath: string): {
  isFragmented: boolean;
  hasInitSegment: boolean;
  sequenceCount: number;
  errors: string[];
} {
  const result = {
    isFragmented: false,
    hasInitSegment: false,
    sequenceCount: 0,
    errors: [] as string[],
  };

  try {
    const output = execSync(`mp4dump "${videoPath}"`, { encoding: "utf8" });

    // Check for mvex (Movie Extends) box - indicates fragmented MP4
    result.isFragmented = output.includes("[mvex]");

    // Check for moov box (init segment)
    result.hasInitSegment = output.includes("[moov]");

    // Count moof boxes (fragments)
    const moofMatches = output.match(/\[moof\]/g);
    result.sequenceCount = moofMatches ? moofMatches.length : 0;

    if (!result.isFragmented) {
      result.errors.push("Not a fragmented MP4 (missing mvex box)");
    }

    if (!result.hasInitSegment) {
      result.errors.push("Missing init segment (moov box)");
    }

    if (result.sequenceCount === 0) {
      result.errors.push("No fragments found (moof boxes)");
    }

    return result;
  } catch (error) {
    result.errors.push(
      `Fragment validation error: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    return result;
  }
}

/**
 * Verify duration metadata consistency across different boxes
 */
export function validateDurationMetadata(videoPath: string): {
  isConsistent: boolean;
  movieDuration: number;
  ffprobeDuration: number;
  difference: number;
  errors: string[];
} {
  const result = {
    isConsistent: false,
    movieDuration: 0,
    ffprobeDuration: 0,
    difference: 0,
    errors: [] as string[],
  };

  try {
    // Get ffprobe duration
    const ffprobeOutput = execSync(
      `ffprobe -v quiet -print_format json -show_format "${videoPath}"`,
      { encoding: "utf8" },
    );
    const ffprobeData = JSON.parse(ffprobeOutput);
    result.ffprobeDuration = parseFloat(ffprobeData.format?.duration || "0");

    // Get mp4dump duration
    const mp4Output = execSync(`mp4dump "${videoPath}"`, {
      encoding: "utf8",
    });

    // Extract mvhd duration and timescale
    const mvhdMatch = mp4Output.match(
      /\[mvhd\][\s\S]*?timescale = (\d+)[\s\S]*?duration = (\d+)/,
    );

    if (mvhdMatch) {
      const timescale = parseInt(mvhdMatch[1] || "1000");
      const duration = parseInt(mvhdMatch[2] || "0");
      result.movieDuration = duration / timescale;
    }

    result.difference = Math.abs(
      result.movieDuration - result.ffprobeDuration,
    );

    // Allow 0.1s tolerance
    result.isConsistent = result.difference < 0.1;

    if (!result.isConsistent) {
      result.errors.push(
        `Duration mismatch: movie=${result.movieDuration.toFixed(3)}s, ffprobe=${result.ffprobeDuration.toFixed(3)}s`,
      );
    }

    return result;
  } catch (error) {
    result.errors.push(
      `Duration validation error: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    return result;
  }
}
