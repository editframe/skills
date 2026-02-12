---
title: Image Files
description: Upload and manage static images (JPEG, PNG, WebP, SVG)
type: reference
nav:
  parent: "API Reference / Files"
  priority: 22
api:
  functions:
    - name: createImageFile
      signature: "createImageFile(client, payload)"
      description: Register image file
      returns: CreateImageFileResult
    - name: uploadImageFile
      signature: "uploadImageFile(client, uploadDetails, fileStream, chunkSizeBytes?)"
      description: Upload image data with progress reporting
      returns: IteratorWithPromise<UploadChunkEvent>
    - name: getImageFileMetadata
      signature: "getImageFileMetadata(client, id)"
      description: Get image dimensions and format
      returns: GetImageFileMetadataResult | null
    - name: lookupImageFileByMd5
      signature: "lookupImageFileByMd5(client, md5)"
      description: Find existing image by hash
      returns: LookupImageFileByMd5Result | null
---

# Image Files

Upload and manage static images for use in compositions.

## createImageFile

Register an image file.

```typescript
import { createImageFile } from "@editframe/api";
import { md5 } from "@editframe/assets";
import { readFile, stat } from "node:fs/promises";

const imagePath = "thumbnail.jpg";
const imageData = await readFile(imagePath);
const imageStats = await stat(imagePath);

const imageFile = await createImageFile(client, {
  md5: md5(imageData),
  filename: "thumbnail.jpg",
  byte_size: imageStats.size,
  mime_type: "image/jpeg",  // Optional if filename has known extension
});
```

Supported formats: JPEG, PNG, WebP, SVG. Maximum size: 16MB.

## uploadImageFile

Upload image data with progress reporting.

```typescript
import { uploadImageFile } from "@editframe/api";
import { createReadStream } from "node:fs";

const imageStream = createReadStream("thumbnail.jpg");

for await (const event of uploadImageFile(
  client,
  { id: imageFile.id, byte_size: imageStats.size },
  imageStream
)) {
  if (event.type === "progress") {
    console.log(`Upload: ${event.progress.toFixed(1)}%`);
  }
}
```

The `uploadDetails` parameter requires both `id` and `byte_size`.

## getImageFileMetadata

Get image dimensions and format.

```typescript
import { getImageFileMetadata } from "@editframe/api";

const metadata = await getImageFileMetadata(client, imageFile.id);

if (metadata) {
  console.log(metadata.width);      // 1920
  console.log(metadata.height);     // 1080
  console.log(metadata.mime_type);  // "image/jpeg"
}
```

Returns `null` if the image file doesn't exist.

## lookupImageFileByMd5

Check if an image already exists before uploading.

```typescript
import { lookupImageFileByMd5 } from "@editframe/api";

const hash = md5(imageData);
const existing = await lookupImageFileByMd5(client, hash);

if (existing && existing.complete) {
  console.log("Image already uploaded");
} else {
  // Upload new image
  const imageFile = await createImageFile(client, {
    md5: hash,
    filename: "thumbnail.jpg",
    byte_size: imageStats.size,
    mime_type: "image/jpeg",
  });
  // ... continue upload
}
```

## Using in Compositions

Reference images by their asset ID:

```typescript
const html = `
  <ef-configuration api-host="https://editframe.com">
    <ef-timegroup mode="contain" class="w-[1920px] h-[1080px]">
      <ef-image 
        asset-id="${imageFile.id}"
        class="size-full object-cover">
      </ef-image>
    </ef-timegroup>
  </ef-configuration>
`;
```

The `asset-id` attribute tells the element to fetch from the Editframe API. The `api-host` on `ef-configuration` sets the API base URL for all child elements.
