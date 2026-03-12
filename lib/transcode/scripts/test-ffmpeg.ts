/**
 * Simple test script to verify FFmpeg is working
 */
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

// Create test-assets directory if it doesn't exist
const outputDir = path.join(process.cwd(), "test-assets");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const outputPath = path.join(outputDir, "test-card.mp4");

// This will generate a 1-second test card video
const ffmpegArgs = [
  "-f",
  "lavfi",
  "-i",
  "testsrc=size=320x240:rate=15:duration=1",
  "-f",
  "lavfi",
  "-i",
  "sine=frequency=220:sample_rate=44100:duration=1",
  "-c:v",
  "libx264",
  "-preset",
  "ultrafast",
  "-c:a",
  "aac",
  "-b:a",
  "96k",
  "-y", // Overwrite output file if it exists
  outputPath,
];

console.log("Testing FFmpeg...");
console.log("Command:", "ffmpeg", ffmpegArgs.join(" "));

// Run FFmpeg command
const ffmpeg = spawn("ffmpeg", ffmpegArgs);

ffmpeg.stdout.on("data", () => {});

ffmpeg.stderr.on("data", (data) => {
  process.stderr.write(data);
});

// Handle completion
ffmpeg.on("close", (code) => {
  if (code === 0) {
    console.log(`\nSuccess! Test video created at: ${outputPath}`);
  } else {
    console.error(`\nFFmpeg process exited with code ${code}`);
  }
});
