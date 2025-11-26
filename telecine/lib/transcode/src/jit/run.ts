import * as fs from "node:fs";
import { execSync } from "node:child_process";
import {
  frameDuration,
  getClosestAlignedTime,
  generateCommandAndDirectivesForSegment,
} from "./calculations";
import {
  repackageInitSegment,
  repackageMediaSegment,
} from "@/muxing/repackageFragements";
import ISOBoxer from "codem-isoboxer";

// Feel free to change these constants for your own testing.
const DEFAULT_SEGMENT_DURATION = 1.0;

// Clean up and create output directory
if (fs.existsSync("out")) {
  fs.rmSync("out", { recursive: true, force: true });
}
fs.mkdirSync("out", { recursive: true });

let inputFile: string | null = null;
let targetSegmentDuration: number;

// Parse command line arguments
if (process.argv.length === 3 && !/^-?\d+(\.\d+)?$/.test(process.argv[2])) {
  inputFile = process.argv[2];
  targetSegmentDuration = DEFAULT_SEGMENT_DURATION;
} else {
  targetSegmentDuration = parseFloat(
    process.argv[2] || DEFAULT_SEGMENT_DURATION.toString(),
  );
}

if (targetSegmentDuration <= 0) {
  throw new Error("Segment duration must be greater than 0");
}

if (process.argv.length === 4) {
  inputFile = process.argv[3];
}

// Handle URL downloads
// if (inputFile && /^https?:\/\//.test(inputFile)) {
//   const url = new URL(inputFile);
//   console.log(`Downloading file from ${url}...`);

//   const downloadFile = (url: URL): Buffer => {
//     const client = url.protocol === 'https:' ? https : http;

//     // Synchronous approach using execSync with curl
//     const curlCmd = `curl -s -L "${url.toString()}" -o out/downloaded-file`;
//     execSync(curlCmd, { stdio: 'inherit' });

//     return fs.readFileSync('out/downloaded-file');
//   };

//   try {
//     downloadFile(url);
//     inputFile = 'out/downloaded-file';
//   } catch (error) {
//     throw error;
//   }
// } else if (inputFile) {
//   console.log(`Using local file ${inputFile}`);
// } else {
//   // Generate the sine wave we'll use as input
//   const sineWaveCmd = `ffmpeg -hide_banner -loglevel error -nostats -y -f lavfi -i "sine=frequency=${SINE_FREQUENCY}:duration=${SINE_WAVE_DURATION}" out/${SINE_WAVE_FILE_NAME}`;
//   execSync(sineWaveCmd, { stdio: 'inherit' });
//   inputFile = `out/${SINE_WAVE_FILE_NAME}`;
// }

// Check file signature to detect MP3
// const fileHandle = fs.openSync(inputFile!, 'r');
// const buffer = Buffer.alloc(3);
// fs.readSync(fileHandle, buffer, 0, 3, 0);
// fs.closeSync(fileHandle);

// const firstThreeBytesInHex = buffer.toString('hex');
// const firstTwoBytesInHex = firstThreeBytesInHex.substring(0, 4);

// // Byte signatures taken from https://en.wikipedia.org/wiki/List_of_file_signatures
// const looksLikeMp3 = firstThreeBytesInHex === '494433' ||
//   firstTwoBytesInHex === 'fffb' ||
//   firstTwoBytesInHex === 'fff3' ||
//   firstTwoBytesInHex === 'fff2';

// if (looksLikeMp3) {
//   // Something about mp3s make it so they have extra padding between them when
//   // split. Remuxing to mkv fixes it.
//   //
//   // NOTE: There may be other formats that benefit from remuxing to MKV too.
//   console.log('Detected mp3 input file. Remuxing to mkv...');
//   const remuxCmd = `ffmpeg -hide_banner -loglevel error -nostats -y -i ${inputFile} -c copy out/remuxed.mkv`;
//   console.log(remuxCmd);
//   execSync(remuxCmd, { stdio: 'inherit' });
//   inputFile = 'out/remuxed.mkv';
// }

// Get duration of input file
const durationCmd = `ffprobe -hide_banner -loglevel error -select_streams a:0 -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${inputFile}`;
console.log(durationCmd);
const durationOutput = execSync(durationCmd, { encoding: "utf8" });
const duration = parseFloat(durationOutput.trim());
console.log(`Input file duration: ${duration}`);

// Generate the commands we'll use to slice the sine wave into segments and the
// directives we'll use to recombine them later.
const numSegments = Math.ceil(duration / targetSegmentDuration);
const commandsAndDirectives: Array<[string, string]> = [];
const segmentTimings: Array<{
  startTime: number;
  endTime: number;
  isLast: boolean;
}> = [];

for (let i = 0; i < numSegments; i++) {
  const startTime = Math.round(i * targetSegmentDuration * 1000000);
  const endTime = Math.min(
    Math.round((i + 1) * targetSegmentDuration * 1000000),
    duration * 1000000,
  );
  const isLast = i === numSegments - 1;

  // Store timing information for video extraction later
  segmentTimings.push({ startTime, endTime, isLast });

  const result = generateCommandAndDirectivesForSegment(
    inputFile!,
    i,
    startTime,
    endTime,
    isLast,
  );
  commandsAndDirectives.push(result);
}

const allDirectives = commandsAndDirectives
  .map(([cmd, directives]) => directives)
  .join("\n");
fs.writeFileSync("out/audio-concat.txt", allDirectives);

console.log("---");

// Run the commands.
commandsAndDirectives.forEach(([cmd, _]) => {
  console.log(cmd);
  execSync(cmd, { stdio: "inherit" });
});

console.log("---");

// Create individual MP4 files for each segment with both audio and video
console.log(
  "Creating individual MP4 files with audio and video for each segment...",
);
commandsAndDirectives.forEach(([_, directives], index) => {
  const segmentIndex = index + 1;
  const segmentConcatFile = `out/seg${segmentIndex}-concat.txt`;
  const segmentMp4File = `out/seg${segmentIndex}.mp4`;
  const { startTime, endTime } = segmentTimings[index];

  // Parse inpoint and outpoint from the directives to get exact timing
  const directiveLines = directives.split("\n");
  const inpointLine = directiveLines.find((line) => line.startsWith("inpoint"));
  const outpointLine = directiveLines.find((line) =>
    line.startsWith("outpoint"),
  );

  if (!inpointLine || !outpointLine) {
    throw new Error(
      `Could not find inpoint/outpoint in directives for segment ${segmentIndex}`,
    );
  }

  const inpointUs = parseFloat(inpointLine.split(" ")[1].replace("us", ""));
  const outpointUs = parseFloat(outpointLine.split(" ")[1].replace("us", ""));

  // Recalculate the padded start time using the same logic as calculations.ts
  const alignedStartTime = getClosestAlignedTime(startTime);
  const alignedEndTime = getClosestAlignedTime(endTime);

  let startTimeWithPadding = Math.max(
    alignedStartTime - frameDuration() * 2,
    0,
  );

  if (index > 0) {
    const extraTimeAtBeginning = frameDuration() * 2;
    startTimeWithPadding = Math.max(
      startTimeWithPadding - extraTimeAtBeginning,
      0,
    );
  }

  // Calculate the actual content timing in the original file
  const actualStartTimeUs = startTimeWithPadding + inpointUs;
  const actualDurationUs = outpointUs - inpointUs;

  const actualStartTimeSeconds = actualStartTimeUs / 1000000;
  const actualDurationSeconds = actualDurationUs / 1000000;

  // Write the individual segment's concat directive to a temporary file
  fs.writeFileSync(segmentConcatFile, directives);

  // Create the fragmented MP4 with both audio and video in a single step
  // First input: video from original file at precise timing
  // Second input: audio from AAC segment using concat directive
  // Transcode video with single keyframe per segment to ensure single moof
  const combineCmd = `ffmpeg -hide_banner -loglevel error -nostats -y -ss ${actualStartTimeSeconds} -t ${actualDurationSeconds} -i ${inputFile} -f concat -i ${segmentConcatFile} -map 0:v:0 -map 1:a:0 -c:v libx264 -g 999 -keyint_min 999 -c:a copy -bsf:a aac_adtstoasc -movflags cmaf+empty_moov+delay_moov ${segmentMp4File}`;
  console.log(combineCmd);
  execSync(combineCmd, { stdio: "inherit" });
});

console.log("---");

// Repackage the individual MP4 files into .m4s segments
console.log("Repackaging MP4 segments into .m4s files...");
const m4sFiles: string[] = [];

// Create init segment from the first MP4 file
const firstMp4File = `out/seg1.mp4`;
if (fs.existsSync(firstMp4File)) {
  const firstMp4Buffer = fs.readFileSync(firstMp4File);
  const firstMp4IsoFile = ISOBoxer.parseBuffer(firstMp4Buffer.buffer);

  // Calculate total duration for init segment
  const totalDurationMs = duration * 1000;
  const initSegmentBytes = repackageInitSegment(
    firstMp4IsoFile,
    totalDurationMs,
  );
  const initSegmentFile = "out/init.m4s";
  fs.writeFileSync(initSegmentFile, new Uint8Array(initSegmentBytes));
  m4sFiles.push(initSegmentFile);
  console.log(`Created init segment: ${initSegmentFile}`);
}

// Create media segments from each MP4 file
for (let i = 0; i < numSegments; i++) {
  const segmentIndex = i + 1;
  const mp4File = `out/seg${segmentIndex}.mp4`;
  const m4sFile = `out/seg${segmentIndex}.m4s`;

  if (fs.existsSync(mp4File)) {
    const mp4Buffer = fs.readFileSync(mp4File);
    const mp4IsoFile = ISOBoxer.parseBuffer(mp4Buffer.buffer);

    // Calculate base media decode time for this segment
    const baseMediaDecodeTimeMs = i * targetSegmentDuration * 1000;

    const mediaSegmentBytes = repackageMediaSegment(
      mp4IsoFile,
      i,
      baseMediaDecodeTimeMs,
    );
    fs.writeFileSync(m4sFile, new Uint8Array(mediaSegmentBytes));
    m4sFiles.push(m4sFile);
    console.log(`Created media segment: ${m4sFile}`);
  }
}

console.log("---");

// Concatenate all .m4s files into final fragmented MP4
console.log("Concatenating .m4s files into final fragmented MP4...");
const finalFragmentedFile = "out/final-fragmented.mp4";
const concatenatedBuffer = Buffer.concat(
  m4sFiles.map((file) => fs.readFileSync(file)),
);
fs.writeFileSync(finalFragmentedFile, concatenatedBuffer);
console.log(`Created final fragmented MP4: ${finalFragmentedFile}`);

console.log("---");

// Stitch the segments back together.
const concatCmd =
  "ffmpeg -hide_banner -loglevel error -nostats -y -f concat -i out/audio-concat.txt -c copy out/stitched.mp4";
console.log(concatCmd);
console.log(allDirectives);
execSync(concatCmd, { stdio: "inherit" });
