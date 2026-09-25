---
name: editframe-api
description: "JavaScript/TypeScript SDK and CLI for Editframe's video rendering API. Create renders, upload and process video, image, and caption files, transcribe audio, sign URLs for browser playback, and render or preview compositions from the command line."
license: MIT
metadata:
  author: editframe
  version: "4.0"
---


# Editframe API & CLI

`@editframe/api` is a JavaScript/TypeScript client for Editframe's video rendering API. The `editframe` CLI adds local rendering and preview during development. Use these tools to render videos from HTML compositions, upload and process media files, transcribe audio, and manage authenticated browser access to CDN resources.

## Quick Start

```typescript
import { Client, createRender, getRenderProgress, downloadRender } from "@editframe/api";

const client = new Client(process.env.EDITFRAME_API_KEY);

const render = await createRender(client, {
  html: `<ef-timegroup mode="contain" class="w-[1920px] h-[1080px]">
    <ef-video src="https://assets.editframe.com/bars-n-tone.mp4"></ef-video>
  </ef-timegroup>`,
  width: 1920,
  height: 1080,
  fps: 30,
});

for await (const event of await getRenderProgress(client, render.id)) {
  if (event.type === "progress") console.log(`Progress: ${(event.data.progress * 100).toFixed(0)}%`);
}

const response = await downloadRender(client, render.id);
const buffer = await response.arrayBuffer();
```

```bash
# Local dev: preview and render with the CLI instead of the API
npx editframe preview
npx editframe render -o output.mp4
```

## Client & Authentication

```typescript
import { Client } from "@editframe/api";

const client = new Client(process.env.EDITFRAME_API_KEY);      // server-side: Bearer token
const client = new Client();                                    // browser: session cookie (credentials: "include")
const client = new Client(apiKey, "https://staging.editframe.com"); // optional second arg overrides the host (default https://editframe.com)
```

An API key has the shape `ef_<secret>_<keyid>`. The client validates this shape locally. Get a key from the Editframe dashboard, under Settings → API Keys. Error behavior varies by SDK function. Handle rejected requests and the documented result states.

**Never expose an API key in client-side code.** For browser playback of authenticated media, use [URL Signing](#url-signing) instead. The server holds the key. The browser receives only short-lived, scoped tokens.

`@editframe/api` still exports older, type-specific resources: `createImageFile`, `createCaptionFile`, `createISOBMFFFile`, `createTranscription`, and others. These are `@deprecated` in favor of the unified `createFile`/`type: "video"|"image"|"caption"` API. Do not use them in new code.

## Unified Files API

All file types — video, image, caption — share one set of endpoints. A `type` field selects the endpoint's behavior:

| Type | Formats | Max size | Processing |
|---|---|---|---|
| `video` | MP4, MOV, WebM, MKV | 1GB | Auto-converted to ISOBMFF (enables frame-accurate seek + adaptive streaming) |
| `image` | JPEG, PNG, WebP, SVG | 16MB | Ready immediately |
| `caption` | VTT, SRT | 2MB | Ready immediately |

Status lifecycle: `created → uploading → processing → ready` (image/caption skip `processing`), or `→ failed`.

```typescript
import { Client, createFile, uploadFile, getFileProcessingProgress } from "@editframe/api";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";

const client = new Client(process.env.EDITFRAME_API_KEY);
const fileStats = await stat("video.mp4");

const file = await createFile(client, { filename: "video.mp4", type: "video", byte_size: fileStats.size });

for await (const event of uploadFile(client, { id: file.id, byte_size: fileStats.size, type: "video" }, Readable.toWeb(createReadStream("video.mp4")))) {
  if (event.type === "progress") console.log(`Upload: ${(event.progress * 100).toFixed(1)}%`);
}

for await (const event of await getFileProcessingProgress(client, file.id)) {
  if (event.type === "complete") break;
}
```

`uploadFile` consumes a Web `ReadableStream`. Convert Node streams with `Readable.toWeb`, as above. Browser files expose a compatible stream through `file.stream()`.

The Node helper creates the file record and returns a lazy upload iterator. Consume that iterator to upload the bytes:

```typescript
import { Client, upload, getFileProcessingProgress } from "@editframe/api/node";

const client = new Client(process.env.EDITFRAME_API_KEY);
const { file, uploadIterator } = await upload(client, "video.mp4");
for await (const event of uploadIterator) {
  console.log(`Upload: ${(event.progress * 100).toFixed(1)}%`);
}
for await (const event of await getFileProcessingProgress(client, file.id)) {
  if (event.type === "complete") break;
}
```

Upload completion and media processing completion are separate states.

Check for an existing file before you upload it. Call `lookupFileByMd5(client, md5)`. This returns `null` when no file matches.

Use the file in a composition through `file-id`:

```html
<ef-configuration api-host="https://editframe.com">
  <ef-video file-id="uuid-of-processed-video"></ef-video>
  <ef-image file-id="uuid-of-uploaded-image" class="w-24 h-24"></ef-image>
</ef-configuration>
```

`createFile` assigns `file-id` as a stable UUID. It stays the same through upload, processing, and playback.

### Retention (`expires_at`)

`createFile` and `createRender` both accept an optional `expires_at`: an ISO 8601 date, at most 30 days in the future. Omit it for permanent retention. Invalid input returns `400`, with one of `invalid_datetime`, `must_be_future`, or `exceeds_max_retention`. `getFileDetail` and `getRenderInfo` echo `expires_at` back; `null` means permanent. Remote-URL render ingest (see below) uses a fixed, non-configurable one-hour TTL, unrelated to this field.

## Renders

```typescript
const render = await createRender(client, {
  html: `<ef-timegroup mode="contain" class="w-[1920px] h-[1080px]"><ef-video src="..."></ef-video></ef-timegroup>`,
  width: 1920,
  height: 1080,
  fps: 30,          // default 30
  output: { container: "mp4", video: { codec: "h264" }, audio: { codec: "aac" } }, // default shown
});
```

Output containers: `mp4` (`video.codec: "h264"`, `audio.codec: "aac"`), `jpeg` (`quality` 1–100, default 80), `png` (`compression` 1–100 default 80, `transparency` boolean), `webp` (`quality` 1–100 default 80, `compression` 0–6 default 4, `transparency` boolean).

`createRender` also accepts these advanced options:

- The server configuration selects the execution backend. The SDK's `backend` field does not override the current server flag.
- `work_slice_ms`: splits the render into fragments of this length, in milliseconds. Defaults to 4000 on `"cpu"`, or 15000 on `"gpu"`. Maximum 60000.
- `strategy`: reserved for future render strategies. Only `"v1"` exists today, and it is the default.
- `duration_ms`: overrides the render's detected duration, in milliseconds.
- `metadata`: an arbitrary `Record<string, string>`. `getRenderInfo` and render webhooks echo it back.

A composition's `ef-video`, `ef-audio`, and `ef-image` elements can use `https://` `src` values directly. Editframe downloads and ingests these before rendering, on an ephemeral, roughly one-hour `expires_at`. This differs from a file you register with `createFile`.

Call `lookupRenderByMd5` explicitly when you want to reuse a prior render. `createRender` does not perform that lookup.

Derive the hash from the complete render input, including output settings and stable asset versions. Hashing HTML alone misses those differences.

Before reuse, check the render's completion state, output settings, and retention. A matching hash does not guarantee an available result.

`getRenderProgress` yields `{ type: "progress", data: { progress } }`, with `progress` from 0 to 1, then yields `{ type: "complete" }`. It throws if the render fails. `deleteRender` removes the row and all GCS output and intermediates immediately. It fails while the render is still active: `queued`, `rendering`, or `recovering`.

To register a video you rendered yourself, skip `html` and upload the file directly:

```typescript
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";

const render = await createRender(client, { width: 1920, height: 1080, fps: 30 });
await uploadRender(client, render.id, Readable.toWeb(createReadStream("my-video.mp4")));
```

## Transcription

```typescript
const transcription = await transcribeFile(client, file.id, { trackId: 1 }); // trackId optional, defaults to first audio track
const result = await getFileTranscription(client, file.id); // null if none exists yet; result.status === "completed" when done
```

Load the transcript into `<ef-captions captions-src="captions.json" target="ef-video-id">`. `target` only syncs caption timing to the referenced `ef-video`/`ef-audio` element's local time. It does not fetch transcription data by itself. Set `captions-src`, `captions-script`, or `captions.captionsData` to supply the actual segments. See the `composition` skill's `ef-captions` reference.

## URL Signing

Use URL signing whenever a browser plays Editframe-hosted media directly, for example `<ef-video src="https://editframe.com/api/v1/transcode/...">`. Skip it when all rendering and playback happens server-side, through `createRender`/`downloadRender`.

Your server holds the API key and exposes an endpoint that calls `createURLToken`.

Set the HTML attribute `signing-url` on an ancestor `ef-configuration`. The JavaScript property name is `signingURL`.

Authenticate callers and verify their access to the requested media before you mint a token.

The browser sends `{ url }` to that endpoint and attaches the returned token to the media request.

Tokens last roughly one hour. The browser caches each token per URL. For a transcode or HLS endpoint, one token covers the manifest and all its segments.

```typescript
// Inside your authenticated application router, authorize access to the requested media URL.
import { Client, createURLToken } from "@editframe/api";
const client = new Client(process.env.EDITFRAME_API_KEY);
app.post("/sign-url", async (req, res) => res.json({ token: await createURLToken(client, req.body.url) }));
```

```html
<!-- frontend -->
<ef-configuration api-host="https://editframe.com" signing-url="/sign-url">
  <ef-video src="https://editframe.com/api/v1/transcode/manifest.m3u8?url=..."></ef-video>
</ef-configuration>
```

If you rely on editframe.com session cookies instead of an API key, use `POST /ef-sign-url` instead, with `credentials: "include"` and no `Authorization` header. This is the equivalent anonymous-token flow. Most apps use the API-key server route above instead.

## CLI

```bash
npx @editframe/cli <command>        # one-off
npm install -g @editframe/cli       # or install globally
# Included in html/react scaffolds; install separately for nextjs.
```

Global options, commands, and flags are generated at the end of this file from the commander definitions in `@editframe/cli`.

```typescript
// Read --data / --data-file inside the composition:
import { getRenderData } from "@editframe/elements";
const data = getRenderData<{ userName: string }>();
if (data) document.querySelector("#name").textContent = data.userName;
```

The transcription output, `captions.json`, matches `<ef-captions captions-src>`'s expected shape: `segments`/`word_segments`, with millisecond timestamps. See the `composition` skill's `ef-captions` reference for styling, for example the `<ef-captions-active-word>` nested child.

## Function Index

### Caption File
- `createCaptionFile(client: Client, payload: CreateCaptionFilePayload)` — Create a caption file
- `lookupCaptionFileByMd5(client: Client, md5: string)`
- `uploadCaptionFile(client: Client, fileId: string, fileStream: ReadableStream, fileSize: number)`

### File
- `createFile(client: Client, payload: CreateFilePayload)`
- `createFileTrack(client: Client, fileId: string, payload: CreateISOBMFFTrackPayload)`
- `deleteFile(client: Client, id: string)`
- `getFileDetail(client: Client, id: string)`
- `getFileProcessingProgress(client: Client, id: string)`
- `getFileTranscription(client: Client, id: string)`
- `lookupFileByMd5(client: Client, md5: string)`
- `transcribeFile(client: Client, id: string, options?: { trackId?: number })`
- `uploadFile(client: Client, uploadDetails: { id: string; byte_size: number; type: FileType }, fileStream: ReadableStream)`
- `uploadFileIndex(client: Client, fileId: string, fileStream: ReadableStream, fileSize: number)`
- `uploadFileTrack(client: Client, fileId: string, trackId: number, byteSize: number, fileStream: ReadableStream)`

### Image File
- `createImageFile(client: Client, payload: CreateImageFilePayload)`
- `getImageFileMetadata(client: Client, id: string)`
- `lookupImageFileByMd5(client: Client, md5: string)`
- `uploadImageFile(client: Client, uploadDetails: { id: string; byte_size: number; }, fileStream: ReadableStream, chunkSizeBytes?: number)`

### Isobmff File
- `createISOBMFFFile(client: Client, payload: CreateISOBMFFFilePayload)`
- `getISOBMFFFileTranscription(client: Client, id: string)`
- `lookupISOBMFFFileByMd5(client: Client, md5: string)`
- `transcribeISOBMFFFile(client: Client, id: string, payload?: TranscribeISOBMFFFilePayload)`
- `uploadFragmentIndex(client: Client, fileId: string, fileStream: ReadableStream, fileSize: number)`

### Isobmff Track
- `createISOBMFFTrack(client: Client, payload: CreateISOBMFFTrackPayload)`
- `uploadISOBMFFTrack(client: Client, fileId: string, trackId: number, fileStream: ReadableStream, trackSize: number)`

### Node
- `createImageFileFromPath(client: Client, path: string)`
- `createUnprocessedFileFromPath(client: Client, path: string)`
- `upload(client: Client, filePath: string)`
- `uploadUnprocessedFile(client: Client, uploadDetails: UnprocessedFileUploadDetails, path: string)`

### Process Isobmff
- `getIsobmffProcessInfo(client: Client, id: string)`
- `getIsobmffProcessProgress(client: Client, id: string)`

### Renders
- `createRender(client: Client, payload: CreateRenderPayload)`
- `defaultWorkSliceMs(backend?: "cpu" | "gpu")`
- `deleteRender(client: Client, id: string)`
- `downloadRender(client: Client, id: string)`
- `getRenderInfo(client: Client, id: string)`
- `getRenderProgress(client: Client, id: string)`
- `lookupRenderByMd5(client: Client, md5: string)`
- `uploadRender(client: Client, renderId: string, fileStream: ReadableStream)`

### Transcriptions
- `createTranscription(client: Client, payload: CreateTranscriptionPayload)`
- `getTranscriptionInfo(client: Client, id: string)`
- `getTranscriptionProgress(client: Client, id: string)`

### Unprocessed File
- `createUnprocessedFile(client: Client, payload: CreateUnprocessedFilePayload)`
- `lookupUnprocessedFileByMd5(client: Client, md5: string)`
- `processIsobmffFile(client: Client, id: string)`
- `uploadUnprocessedReadableStream(client: Client, uploadDetails: UnprocessedFileUploadDetails, fileStream: ReadableStream)`

### Url Token
- `createURLToken(client: Client, url: string)`

## CLI Commands

Global options:

| Option | Default | Description |
|---|---|---|
| `-t, --token <token>` | — | API Token |
| `--ef-host <host>` | `https://editframe.com` | Editframe Host |
| `--ef-render-host <host>` | `https://editframe.com` | Editframe Render Host |

| Command | Purpose |
|---|---|
| `editframe auth` | Fetch organization data using API token |
| `editframe check` | Check on dependencies and other requirements |
| `editframe cloud-render [directory]` | Render a directory's index.html file as a video in the editframe cloud |
| `editframe dev-server [directory]` | Start the Editframe dev media server as a standalone service |
| `editframe preview [directory]` | Preview a directory's index.html file |
| `editframe process [directory]` | Process's a directory's index.html file, analyzing assets and processing them for rendering |
| `editframe process-file <file>` | Upload a audio/video to Editframe for processing. |
| `editframe render [directory]` | Render a video composition locally |
| `editframe sync` | Sync assets to Editframe servers for rendering |
| `editframe transcribe <input>` | Generate captions from audio/video file using whisper_timestamped |
| `editframe webhook` | Send a test webhook event to the URL configured on your API key |

### `editframe dev-server` options

| Option | Default | Description |
|---|---|---|
| `-p, --port <number>` | `3099` | Port to listen on |
| `--cache-root <path>` | — | Directory for cached transcoded assets |
| `--public-origin <origin>` | — | Public-facing origin injected into JIT manifests |

### `editframe render` options

| Option | Default | Description |
|---|---|---|
| `-o, --output <path>` | `output.mp4` | Output file path |
| `--url <url>` | — | URL to render (bypasses directory/server startup) |
| `-d, --data <json>` | — | Custom render data (JSON string) |
| `--data-file <path>` | — | Custom render data from JSON file |
| `--fps <number>` | `30` | Frame rate |
| `--scale <number>` | `1` | Resolution scale (0-1) |
| `--include-audio` | `true` | Include audio track |
| `--no-include-audio` | — | Exclude audio track |
| `--from-ms <number>` | — | Start time in milliseconds |
| `--to-ms <number>` | — | End time in milliseconds |
| `--capture <strategy>` | `auto` | Frame capture strategy: auto, native, foreign-object, painter |
| `--experimental-native-render` | — | Alias for --capture native (enables Chrome's canvas-draw-element flag) |
| `--profile` | — | Enable CPU profiling |
| `--profile-output <path>` | `./render-profile.cpuprofile` | Profile output path |

### `editframe transcribe` options

| Option | Default | Description |
|---|---|---|
| `-o, --output <file>` | `captions.json` | Output JSON file |
| `-l, --language <lang>` | `en` | Language code (e.g., en, es, fr) |
