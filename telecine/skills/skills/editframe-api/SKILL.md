---
name: editframe-api
title: Server API
description: JavaScript/TypeScript SDK for Editframe's video rendering API. Create renders, upload video and image files, manage assets, and sign URLs for playback.
order: 30
license: MIT
metadata:
  author: editframe
  version: "2.0"
---

# Editframe API

JavaScript/TypeScript client for Editframe's video rendering API. Render videos from HTML compositions, upload and process media files, and manage authenticated access to CDN resources.

## Before you start

**API key required.** All calls need a valid API key passed to `new Client(key)` or via `EDITFRAME_API_KEY` env var. Without it, every call returns 401.

- Get a key: Editframe dashboard → API Keys → Create
- Missing key at runtime → `Client` constructor throws; handle this before making any API calls

**Rate limits:** The API is rate-limited per API key. For bulk operations (uploading many files, creating many renders), add delays between requests or implement retry with exponential backoff on 429 responses.

**Browser vs server:** `Client` is for server-side use only — never expose your API key to browsers. For browser-side media access, use URL signing (`createURLToken`) instead.

## Quick Start

```typescript
import { Client, createRender, getRenderProgress, downloadRender } from "@editframe/api";

// Initialize client with API key
const client = new Client(process.env.EDITFRAME_API_KEY);

// Create a render from HTML composition
const render = await createRender(client, {
  html: `<ef-timegroup mode="contain" class="w-[1920px] h-[1080px]">
    <ef-video src="https://assets.editframe.com/bars-n-tone.mp4"></ef-video>
  </ef-timegroup>`,
  width: 1920,
  height: 1080,
  fps: 30,
});

// Poll for completion
for await (const event of await getRenderProgress(client, render.id)) {
  console.log(`Progress: ${event.progress}%`);
}

// Download the result
const response = await downloadRender(client, render.id);
const buffer = await response.arrayBuffer();
```

## Function Index

### [Renders](references/renders.md)
- [`createRender(client, payload)`](references/renders.md) → `CreateRenderResult` — Create a render job from HTML composition
- [`uploadRender(client, renderId, fileStream)`](references/renders.md) → `Promise<void>` — Upload pre-rendered video file
- [`getRenderProgress(client, id)`](references/renders.md) → `CompletionIterator` — Stream render progress via SSE
- [`getRenderInfo(client, id)`](references/renders.md) → `LookupRenderByMd5Result` — Get render metadata
- [`lookupRenderByMd5(client, md5)`](references/renders.md) → `LookupRenderByMd5Result | null` — Find existing render by hash
- [`downloadRender(client, id)`](references/renders.md) → `Response` — Download completed render

### [Files (Unified API)](references/files.md)
- [`createFile(client, payload)`](references/files.md) → `CreateFileResult` — Register a file (video, image, or caption)
- [`uploadFile(client, uploadDetails, fileStream)`](references/files.md) → `IteratorWithPromise<UploadChunkEvent>` — Upload file content with progress
- [`getFileDetail(client, id)`](references/files.md) → `FileDetail` — Get file metadata and tracks
- [`lookupFileByMd5(client, md5)`](references/files.md) → `LookupFileByMd5Result | null` — Find existing file by hash
- [`deleteFile(client, id)`](references/files.md) → `{ success: boolean }` — Delete a file
- [`getFileProcessingProgress(client, id)`](references/files.md) → `ProgressIterator` — Stream processing progress for video files
- [`transcribeFile(client, id, options?)`](references/files.md) → `TranscribeFileResult` — Start audio transcription
- [`getFileTranscription(client, id)`](references/files.md) → `FileTranscriptionResult | null` — Get transcription status

### [Node.js Helpers](references/files.md)
- [`upload(client, filePath)`](references/files.md) → `{ file, uploadIterator }` — Upload a file from disk (auto-detects type)

### [URL Signing](references/url-signing.md)
- [`createURLToken(client, url)`](references/url-signing.md) → `string` — Generate signed JWT for browser access to media endpoints

## Unified Files API

All file types (video, image, caption) use a single set of endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /api/v1/files | POST | Create file record |
| /api/v1/files/:id | GET | Get file detail |
| /api/v1/files/:id/upload | GET/POST | Check upload status or upload chunk |
| /api/v1/files/:id/delete | POST | Delete file |
| /api/v1/files/:id/index | GET | Get fragment index (video only) |
| /api/v1/files/:id/tracks/:trackId | GET | Get track data (video only) |
| /api/v1/files/:id/transcribe | POST | Start transcription (video only) |
| /api/v1/files/:id/transcription | GET | Get transcription status |
| /api/v1/files/:id/progress | GET | Stream processing progress (SSE) |
| /api/v1/files/md5/:md5 | GET | Lookup file by MD5 hash |

The file `type` field determines processing behavior:
- `"video"` — uploaded files are automatically processed to ISOBMFF format
- `"image"` — uploaded files are immediately ready
- `"caption"` — uploaded files are immediately ready

## Using Files in Compositions

Reference uploaded files using the `file-id` attribute:

```html
<ef-configuration api-host="https://editframe.com">
  <ef-timegroup mode="contain" class="w-[1920px] h-[1080px]">
    <ef-video file-id="uuid-of-processed-video"></ef-video>
    <ef-image file-id="uuid-of-uploaded-image" class="w-24 h-24"></ef-image>
  </ef-timegroup>
</ef-configuration>
```

The `file-id` is a stable UUID assigned at file creation time and remains the same throughout upload, processing, and playback.

## URL Signing

If your application renders Editframe compositions in a browser, you need URL signing. The browser needs authenticated access to transcode endpoints, but cannot hold your API key.

URL signing creates short-lived, scoped tokens that authorize the browser to access specific media URLs. Set up a server route that calls `createURLToken`, then configure `<ef-configuration signingURL="/your-route">` in your frontend.

See [references/url-signing.md](references/url-signing.md) for implementation details and integration with elements-composition and react-composition.

## Reference

- [references/getting-started.md](references/getting-started.md) — Render your first video in under 5 minutes
- [references/authentication.md](references/authentication.md) — API keys, Client class, server vs. browser patterns
- [references/renders.md](references/renders.md) — createRender, getRenderProgress, downloadRender
- [references/files.md](references/files.md) — Unified files API: createFile, uploadFile, getFileDetail
- [references/url-signing.md](references/url-signing.md) — Signed JWT tokens for browser media access
- [references/media-pipeline.md](references/media-pipeline.md) — Video processing pipeline and file states
- [references/image-files.md](references/image-files.md) — Uploading and referencing image files
- [references/caption-files.md](references/caption-files.md) — Uploading caption/subtitle files
- [references/transcription.md](references/transcription.md) — Audio transcription via WhisperX
- [references/unprocessed-files.md](references/unprocessed-files.md) — Legacy unprocessed file endpoints
