import { basename } from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";

import debug from "debug";

import { idempotentTask } from "../idempotentTask.js";

const execFilePromise = promisify(execFile);

const log = debug("ef:generateCaptions");

interface WhisperWord {
  text: string;
  start: number;
  end: number;
  confidence: number;
}

interface WhisperSegment {
  text: string;
  start: number;
  end: number;
  words: WhisperWord[];
}

interface WhisperOutput {
  segments: WhisperSegment[];
}

interface CaptionOutput {
  segments: Array<{
    start: number;
    end: number;
    text: string;
  }>;
  word_segments: Array<{
    text: string;
    start: number;
    end: number;
  }>;
}

const convertWhisperToEditframeFormat = (
  whisperData: WhisperOutput,
): CaptionOutput => {
  const segments = whisperData.segments.map((segment) => ({
    start: Math.round(segment.start * 1000), // Convert to milliseconds
    end: Math.round(segment.end * 1000),
    text: segment.text.trim(),
  }));

  const word_segments = whisperData.segments.flatMap((segment) =>
    segment.words.map((word) => ({
      text: word.text,
      start: Math.round(word.start * 1000), // Convert to milliseconds
      end: Math.round(word.end * 1000),
    })),
  );

  return { segments, word_segments };
};

export const generateCaptionDataFromPath = async (absolutePath: string) => {
  const args = ["--language", "en", "--efficient", "--output_format", "json", absolutePath];
  log("Running whisper_timestamped", args);
  const { stdout } = await execFilePromise("whisper_timestamped", args);

  try {
    const whisperData = JSON.parse(stdout) as WhisperOutput;
    const captionData = convertWhisperToEditframeFormat(whisperData);
    return JSON.stringify(captionData, null, 2);
  } catch (error) {
    log(`Error parsing whisper output: ${error}`);
    throw new Error(`Failed to parse whisper_timestamped output: ${error}`);
  }
};

const generateCaptionDataTask = idempotentTask({
  label: "captions",
  filename: (absolutePath) => `${basename(absolutePath)}.captions.json`,
  runner: generateCaptionDataFromPath,
});

export const findOrCreateCaptions = async (
  cacheRoot: string,
  absolutePath: string,
) => {
  try {
    return await generateCaptionDataTask(cacheRoot, absolutePath);
  } catch (error) {
    console.trace("Error finding or creating captions", error);
    throw error;
  }
};
