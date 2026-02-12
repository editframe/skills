---
title: Unprocessed Files
description: Upload raw media files before processing to ISOBMFF format
type: reference
nav:
  parent: "API Reference / Files"
  priority: 20
api:
  functions:
    - name: createUnprocessedFile
      signature: "createUnprocessedFile(client, payload)"
      description: Register a raw media file
      returns: CreateUnprocessedFileResult
    - name: uploadUnprocessedReadableStream
      signature: "uploadUnprocessedReadableStream(client, uploadDetails, fileStream)"
      description: Upload raw file content with progress reporting
      returns: IteratorWithPromise<UploadChunkEvent>
    - name: lookupUnprocessedFileByMd5
      signature: "lookupUnprocessedFileByMd5(client, md5)"
      description: Find existing unprocessed file by hash
      returns: LookupUnprocessedFileByMd5Result | null
    - name: processIsobmffFile
      signature: "processIsobmffFile(client, id)"
      description: Process raw file into ISOBMFF format
      returns: ProcessIsobmffFileResult
---

# Unprocessed Files

Upload raw media files before processing to streamable ISOBMFF format.

## Workflow

1. **createUnprocessedFile** — register the raw file
2. **uploadUnprocessedReadableStream** — stream the file content
3. **processIsobmffFile** — convert to ISOBMFF format

## createUnprocessedFile

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

## uploadUnprocessedReadableStream

Upload the raw file content with progress reporting.

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

The upload uses chunked transfer with progress reporting. Maximum file size: 1GB.

## lookupUnprocessedFileByMd5

Check if a file already exists before uploading.

```typescript
import { lookupUnprocessedFileByMd5 } from "@editframe/api";

const hash = md5(fileData);
const existing = await lookupUnprocessedFileByMd5(client, hash);

if (existing && existing.complete) {
  console.log("File already uploaded");
  // Process existing file
  const isobmffFile = await processIsobmffFile(client, existing.id);
} else {
  // Upload new file
  const unprocessedFile = await createUnprocessedFile(client, {
    md5: hash,
    filename: "video.mp4",
    byte_size: fileStats.size,
  });
  // ... continue upload
}
```

This saves upload time and bandwidth when the same file is used multiple times.

## processIsobmffFile

Convert the raw file to ISOBMFF format for streaming.

```typescript
import { processIsobmffFile, getIsobmffProcessProgress } from "@editframe/api";

// Start processing
const isobmffFile = await processIsobmffFile(client, unprocessedFile.id);

// Monitor progress
for await (const event of await getIsobmffProcessProgress(client, isobmffFile.id)) {
  if (event.type === "progress") {
    console.log(`Processing: ${event.progress.toFixed(1)}%`);
  } else if (event.type === "complete") {
    console.log("Processing complete");
    break;
  }
}
```

Processing converts the raw file to ISOBMFF format, which enables:
- Frame-accurate seeking
- Adaptive bitrate streaming
- Efficient composition rendering

Once processing completes, the file is ready to use in compositions. See [media-pipeline.md](media-pipeline.md) for the complete workflow.
