---
title: ISOBMFF Files
description: Work with processed video files in ISOBMFF format for streaming and composition
type: reference
nav:
  parent: "API Reference / Files"
  priority: 21
api:
  functions:
    - name: createISOBMFFFile
      signature: "createISOBMFFFile(client, payload)"
      description: Register processed ISOBMFF file
      returns: CreateISOBMFFFileResult
    - name: uploadFragmentIndex
      signature: "uploadFragmentIndex(client, fileId, fileStream, fileSize)"
      description: Upload fragment index for seeking
      returns: Promise<void>
    - name: lookupISOBMFFFileByMd5
      signature: "lookupISOBMFFFileByMd5(client, md5)"
      description: Find existing ISOBMFF file by hash
      returns: LookupISOBMFFFileByMd5Result | null
    - name: createISOBMFFTrack
      signature: "createISOBMFFTrack(client, payload)"
      description: Register video or audio track
      returns: CreateISOBMFFTrackResult
    - name: uploadISOBMFFTrack
      signature: "uploadISOBMFFTrack(client, fileId, trackId, fileStream, trackSize)"
      description: Upload track data
      returns: IteratorWithPromise<UploadChunkEvent>
    - name: getISOBMFFFileTranscription
      signature: "getISOBMFFFileTranscription(client, id)"
      description: Get transcription metadata for file
      returns: GetISOBMFFFileTranscriptionResult | null
    - name: transcribeISOBMFFFile
      signature: "transcribeISOBMFFFile(client, id, payload)"
      description: Start audio transcription
      returns: TranscribeISOBMFFFileResult
---

# ISOBMFF Files

Work with processed video files in ISOBMFF (MP4) format, optimized for streaming and composition.

ISOBMFF files are created by processing unprocessed files. See [unprocessed-files.md](unprocessed-files.md) for the upload workflow.

## createISOBMFFFile

Register a processed ISOBMFF file.

```typescript
import { createISOBMFFFile } from "@editframe/api";

const isobmffFile = await createISOBMFFFile(client, {
  md5: md5(fileData),
  filename: "video.mp4",
});
```

Typically you use `processIsobmffFile` instead, which creates the ISOBMFF file automatically.

## uploadFragmentIndex

Upload the fragment index for efficient seeking.

```typescript
import { uploadFragmentIndex } from "@editframe/api";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";

const indexPath = "video.mp4.index";
const indexStats = await stat(indexPath);
const indexStream = createReadStream(indexPath);

await uploadFragmentIndex(
  client,
  isobmffFile.id,
  indexStream,
  indexStats.size
);
```

The fragment index enables frame-accurate seeking in the Editframe player.

## lookupISOBMFFFileByMd5

Find an existing ISOBMFF file by hash.

```typescript
import { lookupISOBMFFFileByMd5 } from "@editframe/api";

const existing = await lookupISOBMFFFileByMd5(client, md5Hash);

if (existing) {
  console.log("File already processed");
}
```

## ISOBMFF Tracks

Video and audio tracks within ISOBMFF files.

### createISOBMFFTrack

Register a track.

```typescript
import { createISOBMFFTrack, VideoTrackPayload } from "@editframe/api";

const videoTrack = await createISOBMFFTrack(client, {
  file_id: isobmffFile.id,
  track_id: 1,
  type: "video",
  codec: "avc1",
  width: 1920,
  height: 1080,
  duration_ms: 10000,
} as VideoTrackPayload);
```

For audio tracks:

```typescript
import { AudioTrackPayload } from "@editframe/api";

const audioTrack = await createISOBMFFTrack(client, {
  file_id: isobmffFile.id,
  track_id: 2,
  type: "audio",
  codec: "mp4a",
  sample_rate: 48000,
  channels: 2,
  duration_ms: 10000,
} as AudioTrackPayload);
```

### uploadISOBMFFTrack

Upload track data.

```typescript
import { uploadISOBMFFTrack } from "@editframe/api";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";

const trackPath = "video-track-1.m4s";
const trackStats = await stat(trackPath);
const trackStream = createReadStream(trackPath);

for await (const event of uploadISOBMFFTrack(
  client,
  isobmffFile.id,
  videoTrack.track_id,
  trackStream,
  trackStats.size
)) {
  if (event.type === "progress") {
    console.log(`Upload: ${event.progress.toFixed(1)}%`);
  }
}
```

Maximum track size: 1GB.

## Transcription

### transcribeISOBMFFFile

Start audio transcription for an ISOBMFF file.

```typescript
import { transcribeISOBMFFFile } from "@editframe/api";

const transcription = await transcribeISOBMFFFile(client, isobmffFile.id, {
  trackId: "2", // Optional: specify audio track ID
});

console.log(transcription.id);       // Transcription job ID
console.log(transcription.file_id);  // ISOBMFF file ID
console.log(transcription.track_id); // Audio track ID
```

If you don't specify `trackId`, Editframe uses the first audio track in the file.

### getISOBMFFFileTranscription

Get transcription metadata for an ISOBMFF file.

```typescript
import { getISOBMFFFileTranscription } from "@editframe/api";

const transcription = await getISOBMFFFileTranscription(client, isobmffFile.id);

if (transcription) {
  console.log(transcription.id);
  console.log(transcription.work_slice_ms);
  console.log(transcription.isobmff_track.duration_ms);
}
```

Returns `null` if the file has no transcription.

See [transcription.md](transcription.md) for monitoring transcription progress.

## Using in Compositions

Once processed, reference files by their Editframe URL:

```typescript
const html = `
  <ef-timegroup mode="contain" class="w-[1920px] h-[1080px]">
    <ef-video src="https://editframe.com/api/v1/isobmff_files/${isobmffFile.id}"></ef-video>
  </ef-timegroup>
`;
```

See [media-pipeline.md](media-pipeline.md) for the complete upload-to-composition workflow.
