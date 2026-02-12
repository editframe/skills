---
title: Caption Files
description: Upload and manage subtitle files in WebVTT or SRT format
type: reference
nav:
  parent: "API Reference / Files"
  priority: 23
api:
  functions:
    - name: createCaptionFile
      signature: "createCaptionFile(client, payload)"
      description: Register caption file
      returns: CreateCaptionFileResult
    - name: uploadCaptionFile
      signature: "uploadCaptionFile(client, fileId, fileStream, fileSize)"
      description: Upload caption data
      returns: Promise<void>
    - name: lookupCaptionFileByMd5
      signature: "lookupCaptionFileByMd5(client, md5)"
      description: Find existing captions by hash
      returns: LookupCaptionFileByMd5Result | null
---

# Caption Files

Upload and manage subtitle files in WebVTT or SRT format.

## createCaptionFile

Register a caption file.

```typescript
import { createCaptionFile } from "@editframe/api";
import { md5 } from "@editframe/assets";
import { readFile, stat } from "node:fs/promises";

const captionPath = "subtitles.vtt";
const captionData = await readFile(captionPath);
const captionStats = await stat(captionPath);

const captionFile = await createCaptionFile(client, {
  md5: md5(captionData),
  filename: "subtitles.vtt",
  byte_size: captionStats.size,
});
```

Supported formats: WebVTT (`.vtt`), SRT (`.srt`). Maximum size: 2MB.

## uploadCaptionFile

Upload caption data.

```typescript
import { uploadCaptionFile } from "@editframe/api";
import { createReadStream } from "node:fs";

const captionStream = createReadStream("subtitles.vtt");

await uploadCaptionFile(
  client,
  captionFile.id,
  captionStream,
  captionStats.size
);
```

The `fileSize` parameter is required.

## lookupCaptionFileByMd5

Check if captions already exist before uploading.

```typescript
import { lookupCaptionFileByMd5 } from "@editframe/api";

const hash = md5(captionData);
const existing = await lookupCaptionFileByMd5(client, hash);

if (existing && existing.complete) {
  console.log("Captions already uploaded");
} else {
  // Upload new captions
  const captionFile = await createCaptionFile(client, {
    md5: hash,
    filename: "subtitles.vtt",
    byte_size: captionStats.size,
  });
  // ... continue upload
}
```

## Using in Compositions

Reference captions by their asset ID:

```typescript
const html = `
  <ef-configuration api-host="https://editframe.com">
    <ef-timegroup mode="contain" class="w-[1920px] h-[1080px]">
      <ef-video asset-id="${videoFile.id}"></ef-video>
      <ef-captions 
        asset-id="${captionFile.id}"
        class="absolute bottom-10 left-10 right-10 text-white text-4xl text-center">
      </ef-captions>
    </ef-timegroup>
  </ef-configuration>
`;
```

The `asset-id` attribute tells elements to fetch from the Editframe API. The `api-host` on `ef-configuration` sets the API base URL for all child elements.
