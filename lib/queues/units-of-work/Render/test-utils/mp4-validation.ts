import { execSync } from "node:child_process";

export interface MP4StructureValidation {
  isValid: boolean;
  hasVideoTrack: boolean;
  hasAudioTrack: boolean;
}

/**
 * Validate MP4 buffer contains valid MP4 structure
 */
export const isValidMP4Buffer = (buffer: Buffer): boolean => {
  if (buffer.length < 8) return false;

  // Check for MP4 file type box (ftyp) or other valid MP4 boxes
  const ftypCheck = buffer.subarray(4, 8).toString() === "ftyp";
  const moovCheck = buffer.includes(Buffer.from("moov"));
  const moofCheck = buffer.includes(Buffer.from("moof"));
  const mdatCheck = buffer.includes(Buffer.from("mdat"));

  return ftypCheck || moovCheck || moofCheck || mdatCheck;
};

/**
 * Validate MP4 file structure and track presence
 */
export const validateMP4Structure = async (
  videoPath: string,
): Promise<MP4StructureValidation> => {
  try {
    const output = execSync(
      `ffprobe -v quiet -print_format json -show_streams "${videoPath}"`,
      {
        encoding: "utf8",
      },
    );
    const data = JSON.parse(output);

    const streams = data.streams || [];
    const hasVideoTrack = streams.some(
      (stream: any) => stream.codec_type === "video",
    );
    const hasAudioTrack = streams.some(
      (stream: any) => stream.codec_type === "audio",
    );

    return {
      isValid: streams.length > 0,
      hasVideoTrack,
      hasAudioTrack,
    };
  } catch {
    return { isValid: false, hasVideoTrack: false, hasAudioTrack: false };
  }
};
