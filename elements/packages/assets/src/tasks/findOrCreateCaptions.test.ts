import { writeFile, chmod, mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { generateCaptionDataFromPath } from "./findOrCreateCaptions.js";

// Mock whisper_timestamped that validates two invariants:
// 1. Receives exactly 6 args: --language en --efficient --output_format json <path>
//    (spaces in path would cause exec to split it into more tokens)
// 2. The 6th arg is a real file (metacharacter expansion via exec would mutate the
//    path, pointing to a non-existent file)
const MOCK_WHISPER_SCRIPT = `#!/bin/bash
if [ "$#" -ne 6 ]; then
  echo "expected 6 args but got $#: $*" >&2
  exit 1
fi
FILE_PATH="$6"
if [ ! -f "$FILE_PATH" ]; then
  echo "file not found: $FILE_PATH" >&2
  exit 1
fi
echo '{"segments":[]}'
`;

let tmpDir: string;
let originalPath: string | undefined;

beforeEach(async () => {
  tmpDir = await mkdtemp(path.join(tmpdir(), "ef-captions-test-"));
  originalPath = process.env.PATH;

  const mockBin = path.join(tmpDir, "whisper_timestamped");
  await writeFile(mockBin, MOCK_WHISPER_SCRIPT);
  await chmod(mockBin, 0o755);

  process.env.PATH = `${tmpDir}:${process.env.PATH}`;
});

afterEach(async () => {
  process.env.PATH = originalPath;
  await rm(tmpDir, { recursive: true, force: true });
});

describe("generateCaptionDataFromPath", () => {
  it("passes a path containing spaces as a single argument", async () => {
    const audioFile = path.join(tmpDir, "my audio file.mp4");
    await writeFile(audioFile, "dummy");

    const result = await generateCaptionDataFromPath(audioFile);
    const parsed = JSON.parse(result);

    expect(parsed).toHaveProperty("segments");
    expect(parsed).toHaveProperty("word_segments");
  });

  it("passes a path containing shell metacharacters as a single argument", async () => {
    const audioFile = path.join(tmpDir, "audio$(echo injected).mp4");
    await writeFile(audioFile, "dummy");

    const result = await generateCaptionDataFromPath(audioFile);
    const parsed = JSON.parse(result);

    expect(parsed).toHaveProperty("segments");
  });
});
