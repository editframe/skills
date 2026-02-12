---
title: Files
description: Unified API for uploading, processing, and managing video, image, and caption files
type: reference
nav:
  parent: "API Reference"
  priority: 20
api:
  functions:
    - name: createFile
      signature: "createFile(client, payload)"
      description: Register a file record (video, image, or caption)
      returns: CreateFileResult
    - name: uploadFile
      signature: "uploadFile(client, uploadDetails, fileStream)"
      description: Upload file content with chunked transfer and progress
      returns: IteratorWithPromise<UploadChunkEvent>
    - name: getFileDetail
      signature: "getFileDetail(client, id)"
      description: Get file metadata, status, and tracks (for video)
      returns: FileDetail
    - name: lookupFileByMd5
      signature: "lookupFileByMd5(client, md5)"
      description: Find existing file by MD5 hash
      returns: LookupFileByMd5Result | null
    - name: deleteFile
      signature: "deleteFile(client, id)"
      description: Delete a file
      returns: "{ success: boolean }"
    - name: getFileProcessingProgress
      signature: "getFileProcessingProgress(client, id)"
      description: Stream processing progress for video files via SSE
      returns: ProgressIterator
    - name: transcribeFile
      signature: "transcribeFile(client, id, options?)"
      description: Start audio transcription for a video file
      returns: TranscribeFileResult
    - name: getFileTranscription
      signature: "getFileTranscription(client, id)"
      description: Get transcription status for a file
      returns: FileTranscriptionResult | null
---

# Files

Unified API for uploading, processing, and managing all media file types.

## File Types

| Type | Accepted formats | Max size | Auto-processing |
|------|-----------------|----------|-----------------|
| `video` | MP4, MOV, WebM, MKV | 1GB | Processed to ISOBMFF after upload |
| `image` | JPEG, PNG, WebP, SVG | 16MB | Ready immediately |
| `caption` | VTT, SRT | 2MB | Ready immediately |

## File Lifecycle

Files follow a status progression:

```
created → uploading → processing → ready
                                 ↘ failed
```

- `created` — record registered, awaiting upload
- `uploading` — upload in progress
- `processing` — upload complete, video file being processed to ISOBMFF
- `ready` — file available for use in compositions
- `failed` — processing failed

Image and caption files skip `processing` and go directly to `ready`.

## createFile

Register a file record. The `type` determines processing behavior.

```typescript
import { createFile } from "@editframe/api";

const file = await createFile(client, {
  filename: "video.mp4",
  type: "video",
  byte_size: 10485760,
  md5: "abc123",          // Optional, enables deduplication
  mime_type: "video/mp4", // Optional
});

console.log(file.id);        // UUID, stable throughout lifecycle
console.log(file.status);    // "created"
console.log(file.next_byte); // 0
```

## uploadFile

Upload file content with chunked transfer and progress.

```typescript
import { uploadFile } from "@editframe/api";
import { createReadStream } from "node:fs";

const fileStream = createReadStream("video.mp4");

for await (const event of uploadFile(
  client,
  { id: file.id, byte_size: file.byte_size, type: file.type },
  fileStream
)) {
  if (event.type === "progress") {
    console.log(`Upload: ${event.progress.toFixed(1)}%`);
  }
}
```

Uploads are resumable. If interrupted, re-uploading the same file resumes from `next_byte`.

## getFileDetail

Get file metadata. For video files, also returns track information.

```typescript
import { getFileDetail } from "@editframe/api";

const detail = await getFileDetail(client, file.id);

console.log(detail.status);     // "ready"
console.log(detail.mime_type);  // "video/mp4"
console.log(detail.width);     // 1920
console.log(detail.height);    // 1080

// Video files include tracks
if (detail.tracks) {
  for (const track of detail.tracks) {
    console.log(`Track ${track.track_id}: ${track.type} (${track.codec_name})`);
  }
}
```

Throws if the file is not found.

## lookupFileByMd5

Check if a file already exists before uploading.

```typescript
import { lookupFileByMd5 } from "@editframe/api";

const existing = await lookupFileByMd5(client, "your-file-md5");

if (existing && existing.status === "ready") {
  console.log("File already exists:", existing.id);
} else {
  // Upload new file
}
```

Returns `null` if no file matches.

## deleteFile

Delete a file.

```typescript
import { deleteFile } from "@editframe/api";

const result = await deleteFile(client, file.id);
console.log(result.success); // true
```

## getFileProcessingProgress

Stream processing progress for video files via SSE.

```typescript
import { getFileProcessingProgress } from "@editframe/api";

for await (const event of await getFileProcessingProgress(client, file.id)) {
  if (event.type === "progress") {
    console.log(`Processing: ${event.progress.toFixed(1)}%`);
  } else if (event.type === "complete") {
    console.log("Ready");
    break;
  }
}
```

## transcribeFile

Start audio transcription for a video file.

```typescript
import { transcribeFile } from "@editframe/api";

const transcription = await transcribeFile(client, file.id, {
  trackId: 1, // Optional: specify audio track
});

console.log(transcription.id);
console.log(transcription.file_id);
console.log(transcription.track_id);
```

If `trackId` is omitted, the first audio track is used.

## getFileTranscription

Get transcription status.

```typescript
import { getFileTranscription } from "@editframe/api";

const tx = await getFileTranscription(client, file.id);

if (tx) {
  console.log(tx.status);        // "completed"
  console.log(tx.completed_at);
}
```

Returns `null` if no transcription exists.

## Using in Compositions

Reference files using the `file-id` attribute:

```html
<ef-configuration api-host="https://editframe.com">
  <ef-timegroup mode="contain" class="w-[1920px] h-[1080px]">
    <ef-video file-id="uuid"></ef-video>
    <ef-image file-id="uuid" class="w-24 h-24"></ef-image>
    <ef-captions target="ef-video"></ef-captions>
  </ef-timegroup>
</ef-configuration>
```

The `file-id` is the stable UUID returned by `createFile`. It remains the same throughout the file's lifecycle.

## Node.js Helper

The `@editframe/api/node` subpackage provides a convenience function:

```typescript
import { upload } from "@editframe/api/node";

const { file, uploadIterator } = await upload(client, "video.mp4");

for await (const event of uploadIterator) {
  if (event.type === "progress") {
    console.log(`${event.progress.toFixed(1)}%`);
  }
}

console.log(`${file.type} file ${file.id} uploaded`);
```

This auto-detects file type from the extension, calculates MD5, and handles chunked upload.
