---
title: Files
description: Upload and manage media files including video, audio, images, and captions
type: reference
topic: files
nav:
  parent: "API Reference"
  priority: 20
api:
  functions:
    - name: createUnprocessedFile
      signature: "createUnprocessedFile(client, payload)"
      description: Register a raw media file
      returns: CreateUnprocessedFileResult
    - name: uploadUnprocessedReadableStream
      signature: "uploadUnprocessedReadableStream(client, uploadDetails, fileStream)"
      description: Upload raw file content
      returns: IteratorWithPromise<UploadChunkEvent>
    - name: lookupUnprocessedFileByMd5
      signature: "lookupUnprocessedFileByMd5(client, md5)"
      description: Find existing unprocessed file by hash
      returns: LookupUnprocessedFileByMd5Result | null
    - name: processIsobmffFile
      signature: "processIsobmffFile(client, id)"
      description: Process raw file into ISOBMFF format
      returns: ProcessIsobmffFileResult
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
      signature: "uploadISOBMFFTrack(client, fileId, trackId, fileStream)"
      description: Upload track data
      returns: Promise<void>
    - name: createImageFile
      signature: "createImageFile(client, payload)"
      description: Register image file
      returns: CreateImageFileResult
    - name: uploadImageFile
      signature: "uploadImageFile(client, fileId, fileStream)"
      description: Upload image data
      returns: Promise<void>
    - name: getImageFileMetadata
      signature: "getImageFileMetadata(client, id)"
      description: Get image dimensions and format
      returns: GetImageFileMetadataResult
    - name: lookupImageFileByMd5
      signature: "lookupImageFileByMd5(client, md5)"
      description: Find existing image by hash
      returns: LookupImageFileByMd5Result | null
    - name: createCaptionFile
      signature: "createCaptionFile(client, payload)"
      description: Register caption file (VTT/SRT)
      returns: CreateCaptionFileResult
    - name: uploadCaptionFile
      signature: "uploadCaptionFile(client, fileId, fileStream)"
      description: Upload caption data
      returns: Promise<void>
    - name: lookupCaptionFileByMd5
      signature: "lookupCaptionFileByMd5(client, md5)"
      description: Find existing captions by hash
      returns: LookupCaptionFileByMd5Result | null
---

# Files

Upload and manage media files for use in compositions.

## File Upload Pipeline

The typical workflow for uploading video/audio files:

1. **Create unprocessed file** — register the raw file
2. **Upload file data** — stream the file content
3. **Process to ISOBMFF** — convert to streamable format
4. **Upload tracks** — upload video/audio tracks separately
5. **Use in composition** — reference the file in `<ef-video>` or `<ef-audio>`

For images and captions, the process is simpler: create, upload, use.

## Unprocessed Files

Raw media files before processing.

### createUnprocessedFile

Register a raw media file.

```typescript
import { createUnprocessedFile } from "@editframe/api";
import { md5 } from "@editframe/assets";
import { stat, readFile } from "node:fs/promises";

const filePath = "video.mp4";
const fileData = await readFile(filePath);
const fileStats = await stat(filePath);

const unprocessedFile = await createUnprocessedFile(client, {
  md5: md5(fileData),
  filename: "video.mp4",
  byte_size: fileStats.size,
});

console.log(unprocessedFile.id);
```

### uploadUnprocessedReadableStream

Upload the raw file content.

```typescript
import { uploadUnprocessedReadableStream } from "@editframe/api";
import { createReadStream } from "node:fs";

const fileStream = createReadStream("video.mp4");

for await (const event of uploadUnprocessedReadableStream(
  client,
  { id: unprocessedFile.id, byte_size: fileStats.size },
  fileStream
)) {
  if (event.type === "progress") {
    console.log(`Upload progress: ${event.progress.toFixed(1)}%`);
  }
}

console.log("Upload complete");
```

The upload uses chunked transfer with progress reporting.

### processIsobmffFile

Convert the raw file to ISOBMFF format for streaming.

```typescript
import { processIsobmffFile } from "@editframe/api";

const isobmffFile = await processIsobmffFile(client, unprocessedFile.id);

console.log(isobmffFile.id); // ISOBMFF file ID
```

This triggers server-side processing. Use `getIsobmffProcessProgress` to monitor progress (see Process Monitoring section).

## ISOBMFF Files

Processed files in ISOBMFF (MP4) format, optimized for streaming.

### createISOBMFFFile

Register a processed ISOBMFF file.

```typescript
import { createISOBMFFFile } from "@editframe/api";

const isobmffFile = await createISOBMFFFile(client, {
  md5: md5(fileData),
  filename: "video.mp4",
});
```

Typically you use `processIsobmffFile` instead, which creates the ISOBMFF file automatically.

### uploadFragmentIndex

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

const trackStream = createReadStream("video-track-1.m4s");

await uploadISOBMFFTrack(
  client,
  isobmffFile.id,
  videoTrack.track_id,
  trackStream
);
```

## Image Files

Static images (JPEG, PNG, WebP, GIF).

### createImageFile

Register an image file.

```typescript
import { createImageFile } from "@editframe/api";

const imageFile = await createImageFile(client, {
  md5: md5(imageData),
  filename: "thumbnail.jpg",
  mime_type: "image/jpeg",
});
```

### uploadImageFile

Upload image data.

```typescript
import { uploadImageFile } from "@editframe/api";
import { createReadStream } from "node:fs";

const imageStream = createReadStream("thumbnail.jpg");

await uploadImageFile(client, imageFile.id, imageStream);
```

### getImageFileMetadata

Get image dimensions and format.

```typescript
import { getImageFileMetadata } from "@editframe/api";

const metadata = await getImageFileMetadata(client, imageFile.id);

console.log(metadata.width);      // 1920
console.log(metadata.height);     // 1080
console.log(metadata.mime_type);  // "image/jpeg"
```

## Caption Files

Subtitle files in WebVTT or SRT format.

### createCaptionFile

Register a caption file.

```typescript
import { createCaptionFile } from "@editframe/api";

const captionFile = await createCaptionFile(client, {
  md5: md5(captionData),
  filename: "subtitles.vtt",
  format: "vtt",
});
```

### uploadCaptionFile

Upload caption data.

```typescript
import { uploadCaptionFile } from "@editframe/api";
import { createReadStream } from "node:fs";

const captionStream = createReadStream("subtitles.vtt");

await uploadCaptionFile(client, captionFile.id, captionStream);
```

## Deduplication

All file types support MD5-based deduplication. If a file with the same hash already exists, the lookup functions return it:

```typescript
import { lookupUnprocessedFileByMd5 } from "@editframe/api";

const existing = await lookupUnprocessedFileByMd5(client, md5Hash);

if (existing) {
  console.log("File already uploaded");
} else {
  // Upload new file
}
```

This prevents duplicate uploads and saves storage costs.

## Using Files in Compositions

Once uploaded, reference files by their Editframe URL:

```typescript
const html = `
  <ef-timegroup mode="contain" class="w-[1920px] h-[1080px]">
    <ef-video src="https://editframe.com/api/v1/isobmff_files/${isobmffFile.id}"></ef-video>
    <ef-image src="https://editframe.com/api/v1/image_files/${imageFile.id}"></ef-image>
  </ef-timegroup>
`;
```

See [references/media-pipeline.md](references/media-pipeline.md) for the complete upload-to-composition workflow.
