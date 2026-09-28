---
name: editframe-api
description: "JavaScript/TypeScript SDK for Editframe's cloud video API, plus the editframe CLI for the installed local runtime. Create renders, upload media files, transcribe audio, sign playback URLs, and request exports from the command line."
license: MIT
metadata:
  author: editframe
  version: "4.0"
---


# Editframe API & CLI

`@editframe/api` is a JavaScript/TypeScript client for Editframe's cloud video API. Use it to render videos from Editframe compositions, upload and process media files, transcribe audio, and manage authenticated browser access to CDN resources.

The `editframe` CLI is a thin client for the installed Editframe runtime. It opens the browser editor and requests exports of local projects. See [CLI](#cli).

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

`getFileTranscription` reports status only: `id`, `status`, `completed_at`, `failed_at`, and `work_slice_ms`. It returns no transcript segments.

`ef-captions` needs its caption data from `captions-src`, `captions-script`, or `captions.captionsData`. `target` only syncs caption timing to the referenced `ef-video`/`ef-audio` element's local time. It does not fetch transcription data. See the `composition` skill's `ef-captions` reference.

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

The `editframe` CLI is a thin client for the installed Editframe runtime. It does not bundle the bridge, the editor, or render dependencies. Install the runtime from https://editframe.com/agent first.

```bash
npm install -D @editframe/cli   # already included in the html/react scaffolds
```

Each local command needs `--project` and a bridge. Select the bridge with `--bridge`, `--component`, `EDITFRAME_BRIDGE_PATH`, or `EDITFRAME_COMPONENT_ROOT`. Each command prints JSON.

```bash
export EDITFRAME_BRIDGE_PATH=/absolute/editframe-bridge
npx editframe start --project .
npx editframe open --project .           # prints an editor URL; keep it private
npx editframe compositions --project .
npx editframe context --project . --composition COMPOSITION_ID
```

`context` returns the current revision ID and the supported export settings. For an export, write a request file with a new `operation_id`, that `revision_id`, and supported settings:

```json
{
  "operation_id": "export-demo-001",
  "revision_id": "REPLACE_WITH_CURRENT_REVISION_ID",
  "execution_target": "local",
  "settings": { "container": "mp4", "video_codec": "h264", "audio_codec": "aac", "width": 1280, "height": 720, "fps": 30 }
}
```

```bash
npx editframe export --project . --composition COMPOSITION_ID --input export.json
npx editframe job --project . --job JOB_ID
```

- Keep the browser editor open during a local export. The editor is the renderer.
- The CLI submits and inspects jobs. It does not write a video file. Get the file from the editor.
- Reuse an `operation_id` only for an identical retry. A new revision or new settings need a new `operation_id`.
- `command` applies one revisioned composition edit. Its `--input` file needs `operation_id`, `base_revision_id`, `kind`, and `label`. After a revision conflict, read `context` again and use a new `operation_id`.
- `mcp` connects an agent to the local bridge over MCP stdio. The native agent packages at https://editframe.com/agent include host configuration.

For an enabled hosted runtime, replace `--project` and the bridge with `--endpoint` and `--project-id`. Set `EDITFRAME_TOKEN` in the environment. The `EF_TOKEN` variable of the previous CLI is not a runtime login.

The generated tables at the end of this file list each option and command of the `@editframe/cli` parser.

### Previous Commands

These command names now fail with `CLI_MIGRATION_REQUIRED`:

| Previous command | Current path |
|---|---|
| `preview`, `dev`, `dev-server` | `start` and `open`, or the Vite and Next.js adapters. See the `dev-server` skill. |
| `render` | `export`, or export from the browser editor |
| `auth`, `cloud-render`, `sync` | `@editframe/api`: `createRender` and the unified files API |
| `webhook` | Change the webhook URL of the API key. See the `webhooks` skill. |
| `check`, `process`, `process-file`, `transcribe` | No CLI replacement. Use the browser editor. App builds use `@editframe/build-adapter`. |

## Send Feedback

Send feedback to Editframe about problems and about improvements:

- If Editframe or an Editframe skill causes a problem, find a workaround and continue the task. Then report the problem and the workaround.
- If you find an improvement that can help other tasks too, not only your current task, send a suggestion. For example, suggest a clearer instruction, a missing example, a better default, or a new feature.

Send one report for each different problem or suggestion. If the report fails, continue the task.

```typescript
const headers: Record<string, string> = { "Content-Type": "application/json" };
if (process.env.EDITFRAME_API_KEY) headers.Authorization = `Bearer ${process.env.EDITFRAME_API_KEY}`;

const response = await fetch("https://editframe.com/api/v1/feedback", {
  method: "POST",
  headers,
  body: JSON.stringify({
    category: "feature_request",
    skill: "editframe-api",
    summary: "Add a function that cancels a render",
    details: "A render started with the wrong input. No function stops it, so the render uses time and quota.",
    workaround: "I let the render finish and ignored the output.",
    context: { render_id: render.id, package: "@editframe/api" },
  }),
});
```

Send the body as `application/json`.

| Field | Required | Limit | Content |
|---|---|---|---|
| `category` | Yes | — | One of the categories below |
| `summary` | Yes | 200 characters | One line that names the problem or the suggestion |
| `details` | Yes | 10,000 characters | For a problem: the steps, the expected result, the actual result, and the error messages. For a suggestion: the change and how it helps. |
| `workaround` | No | 10,000 characters | The workaround that you used for a problem |
| `skill` | No | 100 characters | The skill that you used, for example `composition` |
| `context` | No | 20 entries | String values only, for example `render_id`, `file_id`, or package versions. Keys have 1–64 characters. Values have up to 1,000 characters. |

| Category | Use |
|---|---|
| `bug` | Editframe does not operate as the documentation shows. |
| `documentation` | A skill or a document is wrong, unclear, or incomplete. |
| `feature_request` | Editframe does not have a capability that you need. |
| `performance` | An operation is slow or uses too many resources. |
| `other` | All other problems and suggestions, for example about a workflow or the design of an API. |

The request body has a limit of 256 KiB. An unknown field causes an error.

The `Authorization` header is optional. A report with a valid API key identifies your organization. A report without a key is anonymous. Do not put secrets, API keys, or personal data in a report.

| Status | Body | Action |
|---|---|---|
| `201` | `{ "id", "created_at" }` | None. Editframe received the report. |
| `400` | `{ "error": "invalid_json" \| "invalid_feedback", "message" }` | Correct the report from `message` and send it again. |
| `401` | `Unauthorized` | The API key is not valid. Send the report again without the `Authorization` header. |
| `413` | `{ "error": "payload_too_large", "message" }` | Shorten the report. |
| `415` | `{ "error": "unsupported_media_type", "message" }` | Set `Content-Type: application/json`. |
| `429` | `{ "error": "rate_limited", "message" }` | Do not send more reports before the `Retry-After` interval. |
| `503` | `{ "error": "unavailable", "message" }` | Send the report one more time after the `Retry-After` interval. |

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
- `defaultWorkSliceMs()`
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
| `-h, --help` | — | Show usage |
| `--version` | — | Show the CLI version |
| `--project <value>` | — | Absolute local project directory |
| `--bridge <value>` | — | Installed bridge executable |
| `--component <value>` | — | Installed signed component directory |
| `--registry <value>` | — | Local bridge registry directory |
| `--editor <value>` | — | Verified editor asset directory |
| `--editor-version <value>` | — | Verified editor version |
| `--compiler-pack <value>` | — | Verified compiler pack file |
| `--compiler-pack-sha256 <value>` | — | Expected compiler pack SHA-256 |
| `--endpoint <value>` | — | Hosted runtime API endpoint |
| `--project-id <value>` | — | Hosted project identifier |
| `--composition <value>` | — | Composition identifier |
| `--input <value>` | — | JSON request file with an explicit operation identity and revision |
| `--job <value>` | — | Job identifier |

| Command | Purpose |
|---|---|
| `editframe command` | Apply an explicit revisioned composition command |
| `editframe compositions` | List compositions in the selected project |
| `editframe context` | Read a composition's revision and editing context |
| `editframe export` | Request an export of the selected composition |
| `editframe job` | Read one project job |
| `editframe jobs` | List project jobs |
| `editframe mcp` | Connect an agent to the local bridge over MCP stdio |
| `editframe open` | Open the local browser editor |
| `editframe projects` | List accessible projects |
| `editframe start` | Start the installed local bridge for a project |
| `editframe status` | Show local bridge status |
| `editframe stop` | Stop the project's local bridge |
