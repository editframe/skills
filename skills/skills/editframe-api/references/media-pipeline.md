---
title: Media Pipeline
description: Complete workflow from uploading a video file to using it in a composition
type: how-to
nav:
  parent: "Guides"
  priority: 10
---

# Media Pipeline

Upload a video file and use it in a composition.

## Overview

The complete pipeline:

1. Upload raw file → unprocessed file
2. Process to ISOBMFF → streamable format
3. Upload tracks → video and audio data
4. Use in composition → reference in `<ef-video>`

## Step 1: Upload Raw File

```typescript
import { Client, createUnprocessedFile, uploadUnprocessedReadableStream } from "@editframe/api";
import { md5 } from "@editframe/assets";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";

const client = new Client(process.env.EDITFRAME_API_KEY);

// Read file metadata
const filePath = "video.mp4";
const fileData = await readFile(filePath);
const fileStats = await stat(filePath);
const hash = md5(fileData);

// Create unprocessed file record
const unprocessedFile = await createUnprocessedFile(client, {
  md5: hash,
  filename: "video.mp4",
  byte_size: fileStats.size,
});

// Upload file content
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

console.log("Upload complete");
```

## Step 2: Process to ISOBMFF

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

## Step 3: Use in Composition

Once processed, reference the file in your composition:

```typescript
import { createRender, getRenderProgress, downloadRender } from "@editframe/api";
import { writeFileSync } from "node:fs";

const html = `
  <ef-timegroup mode="contain" class="w-[1920px] h-[1080px] bg-black">
    <ef-video 
      src="https://editframe.com/api/v1/isobmff_files/${isobmffFile.id}"
      class="size-full object-contain">
    </ef-video>
    <ef-text 
      class="absolute bottom-10 left-10 text-white text-6xl font-bold">
      My Video
    </ef-text>
  </ef-timegroup>
`;

// Create render
const render = await createRender(client, {
  html,
  width: 1920,
  height: 1080,
  fps: 30,
});

// Wait for completion
for await (const event of await getRenderProgress(client, render.id)) {
  if (event.type === "progress") {
    console.log(`Render: ${event.progress.toFixed(1)}%`);
  } else if (event.type === "complete") {
    break;
  }
}

// Download result
const response = await downloadRender(client, render.id);
const buffer = await response.arrayBuffer();
writeFileSync("output.mp4", Buffer.from(buffer));

console.log("Render saved to output.mp4");
```

## Deduplication

Check if a file already exists before uploading:

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

## Image Pipeline

Images have a simpler pipeline:

```typescript
import { createImageFile, uploadImageFile, lookupImageFileByMd5 } from "@editframe/api";
import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";

const imageData = await readFile("thumbnail.jpg");
const hash = md5(imageData);

// Check for existing image
const existing = await lookupImageFileByMd5(client, hash);

if (existing) {
  console.log("Image already uploaded");
} else {
  // Create and upload
  const imageFile = await createImageFile(client, {
    md5: hash,
    filename: "thumbnail.jpg",
    mime_type: "image/jpeg",
  });

  const imageStream = createReadStream("thumbnail.jpg");
  await uploadImageFile(client, imageFile.id, imageStream);
}

// Use in composition
const html = `
  <ef-timegroup mode="contain" class="w-[1920px] h-[1080px]">
    <ef-image 
      src="https://editframe.com/api/v1/image_files/${imageFile.id}"
      class="size-full object-cover">
    </ef-image>
  </ef-timegroup>
`;
```

## Helper: Node.js File Upload

For Node.js environments, use the `@editframe/api/node` subpackage:

```typescript
import { createUnprocessedFileFromPath, uploadUnprocessedFile } from "@editframe/api/node";

// One-step upload from file path
const unprocessedFile = await createUnprocessedFileFromPath(client, "video.mp4");

// Upload with progress
for await (const event of uploadUnprocessedFile(client, unprocessedFile, "video.mp4")) {
  if (event.type === "progress") {
    console.log(`Upload: ${event.progress.toFixed(1)}%`);
  }
}
```

This handles file reading, MD5 calculation, and chunked upload automatically.

## Error Handling

Handle common errors:

```typescript
try {
  const unprocessedFile = await createUnprocessedFile(client, payload);
} catch (error) {
  if (error.message.includes("413")) {
    console.error("File too large (max 1GB)");
  } else if (error.message.includes("401")) {
    console.error("Invalid API key");
  } else {
    console.error("Upload failed:", error);
  }
}
```

File size limit: 1GB for unprocessed files.

## Next Steps

- [Unprocessed Files](references/unprocessed-files.md) — raw file upload API
- [ISOBMFF Files](references/isobmff-files.md) — processed file API
- [Image Files](references/image-files.md) — image upload API
- [Caption Files](references/caption-files.md) — caption upload API
- [Transcription](references/transcription.md) — add captions to uploaded videos
- Elements Composition skill — composition syntax and element reference
