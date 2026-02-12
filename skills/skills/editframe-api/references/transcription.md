---
title: Transcription
description: Generate audio transcriptions from processed video files
type: reference
nav:
  parent: "API Reference"
  priority: 30
api:
  functions:
    - name: transcribeISOBMFFFile
      signature: "transcribeISOBMFFFile(client, id, payload)"
      description: Start audio transcription for processed file
      returns: TranscribeISOBMFFFileResult
    - name: getISOBMFFFileTranscription
      signature: "getISOBMFFFileTranscription(client, id)"
      description: Get transcription metadata for processed file
      returns: GetISOBMFFFileTranscriptionResult | null
---

# Transcription

Generate audio transcriptions from processed video files.

## transcribeISOBMFFFile

Start audio transcription for a processed file.

```typescript
import { transcribeISOBMFFFile } from "@editframe/api";

// After uploading and processing a video file
const transcription = await transcribeISOBMFFFile(client, processedFile.id, {
  trackId: "2", // Optional: specify audio track ID
});

console.log(transcription.id);       // Transcription job ID
console.log(transcription.file_id);  // Processed file ID
console.log(transcription.track_id); // Audio track ID
```

If you don't specify `trackId`, Editframe uses the first audio track in the file.

## getISOBMFFFileTranscription

Get transcription metadata for a processed file.

```typescript
import { getISOBMFFFileTranscription } from "@editframe/api";

const transcription = await getISOBMFFFileTranscription(client, processedFile.id);

if (transcription) {
  console.log(transcription.id);
  console.log(transcription.work_slice_ms);
  console.log(transcription.isobmff_track.duration_ms);
}
```

Returns `null` if the file has no transcription.

## Complete Workflow

```typescript
import {
  Client,
  createUnprocessedFile,
  uploadUnprocessedReadableStream,
  processIsobmffFile,
  getIsobmffProcessProgress,
  transcribeISOBMFFFile,
  getISOBMFFFileTranscription,
} from "@editframe/api";
import { md5 } from "@editframe/assets";
import { createReadStream, readFile, stat } from "node:fs/promises";

const client = new Client(process.env.EDITFRAME_API_KEY);

// 1. Upload file
const filePath = "video.mp4";
const fileData = await readFile(filePath);
const fileStats = await stat(filePath);

const unprocessedFile = await createUnprocessedFile(client, {
  md5: md5(fileData),
  filename: "video.mp4",
  byte_size: fileStats.size,
});

const fileStream = createReadStream(filePath);
for await (const event of uploadUnprocessedReadableStream(
  client,
  { id: unprocessedFile.id, byte_size: fileStats.size },
  fileStream
)) {
  if (event.type === "progress") {
    console.log(`Upload: ${event.progress.toFixed(1)}%`);
  }
}

// 2. Process to ISOBMFF
const isobmffFile = await processIsobmffFile(client, unprocessedFile.id);

for await (const event of await getIsobmffProcessProgress(client, isobmffFile.id)) {
  if (event.type === "progress") {
    console.log(`Processing: ${event.progress.toFixed(1)}%`);
  } else if (event.type === "complete") {
    break;
  }
}

// 3. Start transcription
const transcription = await transcribeISOBMFFFile(client, isobmffFile.id, {
  trackId: "2", // Optional: specify audio track ID
});

console.log("Transcription started:", transcription.id);

// 4. Get transcription metadata
const result = await getISOBMFFFileTranscription(client, isobmffFile.id);
if (result) {
  console.log("Transcription metadata:", result);
}
```

## Using Transcriptions in Compositions

Once transcribed, use the `<ef-captions>` element with `target` to display captions:

```typescript
const html = `
  <ef-configuration api-host="https://editframe.com">
    <ef-timegroup mode="contain" class="w-[1920px] h-[1080px]">
      <ef-video asset-id="${isobmffFile.id}"></ef-video>
      <ef-captions 
        target="ef-video"
        class="absolute bottom-10 left-10 right-10 text-white text-4xl text-center">
      </ef-captions>
    </ef-timegroup>
  </ef-configuration>
`;
```

The `<ef-captions>` element with `target="ef-video"` automatically fetches transcription data from the video's asset. See the elements-composition skill for complete `<ef-captions>` documentation.
