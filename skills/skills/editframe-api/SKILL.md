---
name: editframe-api
description: JavaScript/TypeScript SDK for Editframe's video rendering API. Create renders, upload media, manage files, and sign URLs for browser-based playback. Use when working with the @editframe/api package, rendering videos programmatically, or integrating Editframe into applications.
license: MIT
metadata:
  author: editframe
  version: "1.0"
---

# Editframe API

JavaScript/TypeScript client for Editframe's video rendering API. Render videos from HTML compositions, upload and process media files, and manage authenticated access to CDN resources.

## Quick Start

```typescript
import { Client, createRender, getRenderProgress, downloadRender } from "@editframe/api";

// Initialize client with API key
const client = new Client("ef_yoursecret_yourkeyid");

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

### Renders
- `createRender(client, payload)` → `CreateRenderResult` — Create a render job from HTML composition
- `uploadRender(client, renderId, fileStream)` — Upload pre-rendered video file
- `getRenderProgress(client, id)` → `CompletionIterator` — Stream render progress via SSE
- `getRenderInfo(client, id)` → `LookupRenderByMd5Result` — Get render metadata
- `lookupRenderByMd5(client, md5)` → `LookupRenderByMd5Result | null` — Find existing render by hash
- `downloadRender(client, id)` → `Response` — Download completed render

### Files - Unprocessed
- `createUnprocessedFile(client, payload)` → `CreateUnprocessedFileResult` — Register a raw media file
- `uploadUnprocessedReadableStream(client, uploadDetails, fileStream)` — Upload raw file content
- `lookupUnprocessedFileByMd5(client, md5)` → `LookupUnprocessedFileByMd5Result | null` — Find existing file by hash
- `processIsobmffFile(client, id)` → `ProcessIsobmffFileResult` — Process raw file into ISOBMFF format

### Files - ISOBMFF
- `createISOBMFFFile(client, payload)` → `CreateISOBMFFFileResult` — Register processed ISOBMFF file
- `uploadFragmentIndex(client, fileId, fileStream, fileSize)` — Upload fragment index for seeking
- `lookupISOBMFFFileByMd5(client, md5)` → `LookupISOBMFFFileByMd5Result | null` — Find existing ISOBMFF file
- `getISOBMFFFileTranscription(client, id)` → `GetISOBMFFFileTranscriptionResult | null` — Get transcription metadata
- `transcribeISOBMFFFile(client, id, payload)` → `TranscribeISOBMFFFileResult` — Start audio transcription

### Files - ISOBMFF Tracks
- `createISOBMFFTrack(client, payload)` → `CreateISOBMFFTrackResult` — Register video/audio track
- `uploadISOBMFFTrack(client, fileId, trackId, fileStream)` — Upload track data

### Files - Images
- `createImageFile(client, payload)` → `CreateImageFileResult` — Register image file
- `uploadImageFile(client, fileId, fileStream)` — Upload image data
- `getImageFileMetadata(client, id)` → `GetImageFileMetadataResult` — Get image dimensions and format
- `lookupImageFileByMd5(client, md5)` → `LookupImageFileByMd5Result | null` — Find existing image

### Files - Captions
- `createCaptionFile(client, payload)` → `CreateCaptionFileResult` — Register caption file (VTT/SRT)
- `uploadCaptionFile(client, fileId, fileStream)` — Upload caption data
- `lookupCaptionFileByMd5(client, md5)` → `LookupCaptionFileByMd5Result | null` — Find existing captions

### Transcription
- `createTranscription(client, payload)` → `CreateTranscriptionResult` — Create transcription job
- `getTranscriptionProgress(client, id)` → `ProgressIterator` — Stream transcription progress
- `getTranscriptionInfo(client, id)` → `TranscriptionInfoResult` — Get transcription metadata

### URL Signing
- `createURLToken(client, url)` → `string` — Generate signed JWT for browser access to media endpoints

### Process Monitoring
- `getIsobmffProcessInfo(client, id)` → `IsobmffProcessInfoResult` — Get file processing metadata
- `getIsobmffProcessProgress(client, id)` → `ProgressIterator` — Stream processing progress

## URL Signing

If your application renders Editframe compositions in a browser, you need URL signing. The browser needs authenticated access to transcode endpoints, but cannot hold your API key.

URL signing creates short-lived, scoped tokens that authorize the browser to access specific media URLs. Set up a server route that calls `createURLToken`, then configure `<ef-configuration signingURL="/your-route">` in your frontend.

See [references/url-signing.md](references/url-signing.md) for implementation details and integration with elements-composition and react-composition.
