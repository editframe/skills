import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import os from "node:os";

import { z } from "zod";

const TimestampSchema = z.object({
  from: z.string(),
  to: z.string(),
});

const OffsetSchema = z.object({
  from: z.number(),
  to: z.number(),
});

const TranscriptionSegmentSchema = z.object({
  timestamps: TimestampSchema,
  offsets: OffsetSchema,
  text: z.string(),
});

const ModelInfoSchema = z.object({
  type: z.string(),
  multilingual: z.boolean(),
  vocab: z.number(),
  audio: z.object({
    ctx: z.number(),
    state: z.number(),
    head: z.number(),
    layer: z.number(),
  }),
  text: z.object({
    ctx: z.number(),
    state: z.number(),
    head: z.number(),
    layer: z.number(),
  }),
  mels: z.number(),
  ftype: z.number(),
});

const WhisperResponseSchema = z.object({
  systeminfo: z.string(),
  model: ModelInfoSchema,
  params: z.object({
    model: z.string(),
    language: z.string(),
    translate: z.boolean(),
  }),
  result: z.object({
    language: z.string(),
  }),
  transcription: z.array(TranscriptionSegmentSchema),
});

export type WhisperResponse = z.infer<typeof WhisperResponseSchema>;

interface TranscriptionSegment {
  text: string;
  start: number;
  end: number;
}

interface TranscriptionWordSegment {
  text: string;
  start: number;
  end: number;
}

interface TranscriptionResult {
  segments: TranscriptionSegment[];
  word_segments: TranscriptionWordSegment[];
}

const segmentText = (
  segments: Array<{ text: string; offsets: { from: number; to: number } }>,
): TranscriptionResult => {
  const result: TranscriptionResult = {
    segments: [],
    word_segments: [],
  };
  let currentSegment: TranscriptionWordSegment[] = [];
  const TIME_GAP_THRESHOLD = 3000;

  for (let i = 0; i < segments.length; i++) {
    const currentWord = segments[i];
    if (!currentWord) continue;
    const nextWord = segments[i + 1];

    result.word_segments.push({
      text: currentWord.text,
      start: Number((currentWord.offsets.from / 1000).toFixed(3)),
      end: Number((currentWord.offsets.to / 1000).toFixed(3)),
    });

    currentSegment.push({
      text: currentWord.text,
      start: Number((currentWord.offsets.from / 1000).toFixed(3)),
      end: Number((currentWord.offsets.to / 1000).toFixed(3)),
    });

    const shouldEndSegment =
      /[.!?]$/.test(currentWord.text) ||
      currentSegment.length >= 8 ||
      (nextWord &&
        nextWord.offsets.from - currentWord.offsets.to > TIME_GAP_THRESHOLD) ||
      i === segments.length - 1;

    if (shouldEndSegment) {
      const firstWord = currentSegment[0];
      const lastWord = currentSegment[currentSegment.length - 1];
      if (!firstWord || !lastWord) continue;

      result.segments.push({
        text: currentSegment.map((s) => s.text).join(" "),
        start: firstWord.start,
        end: lastWord.end,
      });
      currentSegment = [];
    }
  }

  return result;
};

export const transcribe = async (audioPath: string, offsetSeconds: number) => {
  const wavPath = `${audioPath}.padded.wav`;
  const tempJsonPath = join(os.tmpdir(), `whisper-${Date.now()}.json`);

  const env = {
    ...process.env,
    PYTORCH_ENABLE_MPS_FALLBACK: "1",
    COMPUTE_TYPE: "float16",
    DEVICE: "mps",
  };

  try {
    // Convert to WAV and add padding in one command
    await new Promise((resolve, reject) => {
      // biome-ignore format: keep cli args tidy
      const ffmpeg = spawn("ffmpeg", [
        "-y",
        "-i", audioPath,
        "-ar", "16000",
        "-ac", "1",
        "-c:a", "pcm_s16le",
        "-af", "apad=pad_dur=0.1",
        wavPath,
      ]);

      ffmpeg.on("error", (err) => {
        reject(new Error(`Failed to convert audio to WAV: ${err.message}`));
      });

      ffmpeg.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`FFmpeg exited with code ${code}`));
        }
        resolve(undefined);
      });
    });

    // Updated transcription arguments with speed optimizations
    // biome-ignore format: keep cli args tidy
    const transcriptionProcess = spawn(process.env.WHISPER_PATH!, [
      "-m", process.env.GGML_MODEL_PATH!,
      "-f", wavPath,
      "-ml", "1",
      "-sow",
      "-wt", "0.01",
      "-oj",
      "-np",
      ...(process.env.BEAM_SIZE ? ["-bs", process.env.BEAM_SIZE!] : []),
      "-of", tempJsonPath.replace('.json', ''), // Remove .json extension since whisper.cpp adds it
    ], {
      stdio: ["inherit", "inherit", "inherit"],
      env,
    });

    try {
      // Wait for process to complete
      await new Promise((resolve, reject) => {
        transcriptionProcess.on("error", reject);
        transcriptionProcess.on("close", (code) => {
          if (code === 0) resolve(undefined);
          else reject(new Error(`Whisper process exited with code ${code}`));
        });
      });

      // Read and parse the JSON file
      const rawResult = await fs.readFile(tempJsonPath, "utf-8");
      const parsedResult = WhisperResponseSchema.parse(JSON.parse(rawResult));

      // Filter out blank lines and adjust offsets
      const offsetMs = offsetSeconds * 1000;
      return segmentText(
        parsedResult.transcription
          .filter((segment) => segment.text.trim() !== "")
          .map((segment) => ({
            ...segment,
            offsets: {
              from: segment.offsets.from + offsetMs,
              to: segment.offsets.to + offsetMs,
            },
          })),
      );
    } catch (error) {
      transcriptionProcess.kill();
      throw new Error(
        `Transcription failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      // Clean up temporary files
      await Promise.all([
        fs.unlink(tempJsonPath).catch(() => {}),
        fs.unlink(wavPath).catch(() => {}),
      ]);

      if (!transcriptionProcess.killed) {
        transcriptionProcess.kill();
      }
    }
  } catch (error) {
    console.error("Error transcribing audio", error);
    throw new Error(
      `Failed to transcribe audio: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};
