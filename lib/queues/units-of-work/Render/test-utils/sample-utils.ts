import { execFile } from "node:child_process";

/**
 * Return total audio samples in the first audio stream of a media file.
 * Uses packet counting approach for AAC streams (each packet = 1024 samples).
 * Falls back to 0 if the file has no audio or ffprobe fails.
 */
export async function getAudioSampleCount(filePath: string): Promise<number> {
  const commandArgs = [
    "-v",
    "error",
    "-select_streams",
    "a",
    "-show_entries",
    "packet",
    "-of",
    "csv=p=0",
    filePath,
  ];
  console.log(`Running ffprobe with args: ${commandArgs.join(' ')}`);

  return new Promise((resolve) => {
    execFile(
      "ffprobe",
      commandArgs,
      (err, stdout) => {
        if (err) return resolve(0);
        const lines = stdout.trim().split('\n');
        const packetCount = lines.filter(line => line.trim().length > 0).length;
        console.log(`Packet count: ${packetCount}`);
        // For AAC, each packet typically contains 1024 samples
        resolve(packetCount * 1024);
      },
    );
  });
} 