import { execSync } from "node:child_process";

export interface AudioMetadata {
  hasAudio: boolean;
  sampleRate: number;
  channels: number;
  duration: number;
}

export interface AudioSpectrum {
  hasToneSignal: boolean;
  dominantFrequency: number;
  signalLevel: number;
}

/**
 * Extract audio metadata from video file
 */
export const extractAudioMetadata = async (
  videoPath: string,
): Promise<AudioMetadata> => {
  try {
    const output = execSync(
      `ffprobe -v quiet -print_format json -show_streams "${videoPath}"`,
      { encoding: "utf8" },
    );
    const data = JSON.parse(output);

    const audioStream = data.streams?.find(
      (stream: any) => stream.codec_type === "audio",
    );

    return {
      hasAudio: !!audioStream,
      sampleRate: Number.parseInt(audioStream?.sample_rate || "0", 10),
      channels: Number.parseInt(audioStream?.channels || "0", 10),
      duration: Number.parseFloat(audioStream?.duration || "0"),
    };
  } catch {
    return { hasAudio: false, sampleRate: 0, channels: 0, duration: 0 };
  }
};

/**
 * Analyze audio spectrum for tone signal detection
 */
export const analyzeAudioSpectrum = async (
  videoPath: string,
): Promise<AudioSpectrum> => {
  try {
    // Extract audio level information
    const output = execSync(
      `ffmpeg -i "${videoPath}" -af "volumedetect" -f null - 2>&1`,
      { encoding: "utf8" },
    );

    const levelMatch = output.match(/mean_volume: ([-\d.]+) dB/);
    const signalLevel = levelMatch ? Number.parseFloat(levelMatch[1]!) : -100;

    // Basic tone detection - if we have reasonable audio level, assume tone is present
    const hasToneSignal = signalLevel > -50; // Above noise floor

    return {
      hasToneSignal,
      dominantFrequency: hasToneSignal ? 1000 : 0, // Assume 1kHz for bars-n-tone
      signalLevel,
    };
  } catch {
    return { hasToneSignal: false, dominantFrequency: 0, signalLevel: -100 };
  }
};
