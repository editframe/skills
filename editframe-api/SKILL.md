---
name: editframe-api
description: "JavaScript/TypeScript SDK for Editframe's cloud video API, plus the editframe CLI for the installed local runtime. Create renders, upload media files, transcribe audio, sign playback URLs, run video pipelines (preview), and request exports from the command line."
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

An API key has the shape `ef_<secret>_<keyid>`. The client validates this shape locally. Get a key from the Editframe dashboard, under API → API Keys. Error behavior varies by SDK function. Handle rejected requests and the documented result states.

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

## Pipelines (Preview)

Pipelines are in preview. Editframe enables them for each organization. For an organization without pipelines, every pipeline route returns `404`. To ask for access, send an email to hello@editframe.com.

Import pipeline functions from `@editframe/api/pipelines`. This entry point is experimental, and it can change without a major version. The Function Index at the end of this file does not list it.

A pipeline is a named graph of steps with immutable versions. A run processes one `video` file through one version. A step starts after the steps in its `needs` finish. Each step writes its output to a namespace on the file.

```typescript
import { Client, createPipeline, createPipelineRun, getPipelineRun, isPipelineRunTerminal } from "@editframe/api/pipelines";

const client = new Client(process.env.EDITFRAME_API_KEY);
const pipeline = await createPipeline(client, {
  name: "speech-check",
  definition: {
    steps: {
      probe: { type: "probe" },
      transcript: { type: "transcribe", needs: ["probe"] },
      has_speech: { type: "filter", needs: ["transcript"], when: { path: "transcript.metadata.word_count", op: "gt", value: 0 } },
      publish: { type: "publish", needs: ["has_speech"] },
    },
  },
});
const { run } = await createPipelineRun(client, { pipeline_id: pipeline.id, file_id: fileId }, { idempotencyKey: `speech-check:${fileId}` });
let current = await getPipelineRun(client, run.id);
while (!isPipelineRunTerminal(current)) {
  await new Promise((resolve) => setTimeout(resolve, 5000));
  current = await getPipelineRun(client, run.id);
}
```

### Definitions

A definition is `{ steps: { <key>: step } }` with 1–64 steps. Step keys and namespaces match `^[a-z][a-z0-9_]{0,62}$`. An unknown field causes a `422` error.

| Step field | Rule |
|---|---|
| `type` | Required. One of the types below. |
| `needs` | Keys of the steps that must finish first, at most 16. Default `[]`. Cycles are not allowed. |
| `namespace` | Unique. Default: the step key. |
| `granularity` | `{ mode: "file" }` (default), or `{ mode: "segment", window_ms: 1000–3600000, overlap_ms: 0 to window_ms/2 }` |
| `with` | The options of the type |
| `when` | Required for `filter`. Not allowed for other types. |

| Type | `with` (default) | Output |
|---|---|---|
| `probe` | Not allowed | Metadata `duration_ms`, `width`, `height`, `has_video`, `has_audio`, `source`, `tracks` |
| `transcribe` | Not allowed | `speech.segment` and `speech.word` annotations. Metadata `word_count`, `segment_count`, `truncated`, and more. |
| `sample_frames` | `every_ms` 100–600000 (1000) | JPEG frames of the first video track |
| `detect_scenes` | `threshold` 0.01–1 (0.3) | `scene.cut` annotations. Metadata `cut_count`. |
| `endpoint` | `endpoint_id` (required), `max_concurrency` 1–1024 (8) | The output of your service |
| `filter` | Not allowed | No output. The step succeeds or skips. |
| `review` | `instructions` 1–2000 characters, `expires_after_ms` 60000–2592000000 (604800000), `on_expiry` `fail`/`approve`/`reject` (`fail`) | The decision and the corrected annotations |
| `redact_render` | `kinds`: 1–32 annotation kinds (required) | Metadata `render_id`, `status`, `output_url`, and counts |
| `publish` | `formats`: `hls` and/or `dash` (`["hls"]`) | Metadata `source_url`, `hls_url`, `dash_url` |

Obey these rules:

- Use `segment` granularity only for `transcribe`, `sample_frames`, `detect_scenes` and `endpoint`.
- To start a segment step before an upload finishes, make all of its `needs` segment steps. A file step waits for the complete file.
- Windows start on fragment boundaries. A window can be longer than `window_ms`. Segment annotations must stay inside their window.
- `publish` returns playback URLs for the input file. For the redacted video, read `output_url` from the `redact_render` output.
- `redact_render` blurs annotations with `keyframes` and mutes annotations without them. It creates a normal render that uses render minutes. A failed render does not retry automatically.
- Editframe normalizes a definition and records a `sha256:` digest. Equivalent definitions have the same digest.

### Filters

A filter evaluates `when`. A true predicate succeeds the filter. A false predicate skips the filter and every step after it.

- A leaf is `{ path, op, value }`. `path` is `<namespace>.metadata.<field>...` or `<namespace>.annotations...`. A numeric segment selects an array item.
- `op` is `exists`, `non_empty`, `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `in` (1–64 scalars) or `contains`.
- Combine leaves with `{ all: [...] }`, `{ any: [...] }` (1–16 children) and `{ not: predicate }`. The maximum depth is 4.
- Every leaf is false when `path` has no value. This includes `ne`.
- A filter can read only the namespaces of steps that it needs, directly or indirectly. Other paths cause `not_upstream`.
- For a segment step, a filter reads the annotations of all windows. For each metadata field, it reads the value from the last window that sets it.

A final step is a step that no other step needs. When at least one final step succeeds, the run ends `succeeded`. When filters or reviews stop all branches before their final steps, the run ends `filtered`. With two complementary filters, the run ends `succeeded` when the selected branch finishes. Editframe always skips a step that needs both branches.

### Reviews

A review step opens a review task and waits in `waiting_review`.

- `approvePipelineReview(client, id, { metadata_patch })` succeeds the step. The patch is `{ annotations, reviewed_kinds? }`. Each kind in the patch replaces the earlier annotations of that kind for later steps. A kind in `reviewed_kinds` without annotations removes that kind for later steps.
- `rejectPipelineReview(client, id, { reason })` skips the step and the steps after it. `reason` has at most 2000 characters.
- At expiry, `on_expiry: "approve"` succeeds the step, `"reject"` skips it, and `"fail"` fails the run. A retry of the run opens a new review task.
- A different second decision returns `409 review_conflict`. A late decision returns `409 review_expired` or `409 review_not_pending`. The same decision again returns the recorded decision.
- `getPipelineReview` returns `input_namespaces`. Read each one with `getPipelineRunOutputs(client, review.run_id, namespace)`.

### Endpoint Steps

`createPipelineEndpoint(client, { url, headers, timeout_ms, callback_timeout_ms, max_concurrency })` registers your service.

- `url` must use HTTPS and resolve to a public address. You can set at most 16 `headers`.
- Defaults: `timeout_ms` 30000 (1000–600000), `callback_timeout_ms` 3600000 (1000–2592000000), `max_concurrency` 8 (1–1024, across all runs).
- The response contains `signing_secret` (`whsec_...`) one time only. Store it immediately.
- To change limits, use `updatePipelineEndpoint(client, id, { timeout_ms, callback_timeout_ms, max_concurrency })`. Send only the limits to change. The ranges are the same. Requests sent after the change use the new limits.
- An empty body or a value out of range returns `422 invalid_request`. An archived endpoint returns `409 endpoint_archived`.
- You cannot change the URL, the headers or the signing secret. To change them, create a new endpoint and a new pipeline version, and then archive the old endpoint.
- A run whose version names an archived endpoint fails with `endpoint_not_found`.

Editframe sends a signed `POST` with Standard Webhooks headers. The body has `file`, `window` (`null` for a file step), `media` URLs, `metadata` (outputs of the needed steps by namespace), `idempotency_key` and `callback`. Media URLs need no API key and expire at `media.expires_at`, at most four hours later.

```typescript
import { postPipelineCallback, verifyPipelineEndpointRequest } from "@editframe/api/pipelines";

// Pass the raw body bytes. Re-serialized JSON does not verify.
const request = await verifyPipelineEndpointRequest({ secret: process.env.EDITFRAME_ENDPOINT_SECRET!, headers: req.headers, body: rawBody });
// Option 1: answer 200 with { metadata, annotations }.
// Option 2: answer 202, and then post the result:
await postPipelineCallback(request.callback.url, { status: "succeeded", output: { metadata: {}, annotations: [] } });
```

- A `2xx` response other than `202` gives the output. An empty body gives an empty output.
- A `408`, `429` or `5xx` response, a timeout, or a connection error starts a retry. `Retry-After` of up to one hour sets the delay.
- A redirect or another `4xx` response fails the step without a retry.
- After `202`, post `{ status: "heartbeat" }` before the deadline to extend it by `callback_timeout_ms`.
- To report a failure, post `{ status: "failed", error: { message, code?, retryable } }`.
- A callback for an attempt that does not wait returns `409 step_not_waiting`.

An output is `{ metadata?, annotations? }`, at most 1 MiB and 10,000 annotations. An annotation has `kind`, `start_ms` and `end_ms`. It can also have `label`, `text`, `confidence` (0–1), `track_id` and `keyframes`. A keyframe is `{ t_ms, x, y, w, h }` in normalized 0–1 frame coordinates.

### Runs, Groups and Outputs

- `createPipelineRun(client, { pipeline_id, version?, group_id?, file_id, external_id?, metadata? }, { idempotencyKey })` returns `{ run, created }`. The file must have the type `video`. The default version is the latest.
- Reuse an `idempotencyKey` only for an identical request. A different body returns `409 idempotency_conflict`.
- `metadata` is a map of strings: at most 32 keys of 1–256 bytes, values of at most 1024 bytes, and 8192 bytes as compact JSON. You cannot change it after you create the run. It is not the file metadata that steps write.
- `listPipelineRuns(client, { status, pipeline_id, file_id, group_id, metadata })` returns runs newest first. A `metadata` filter returns only the runs that have every entry.

A group holds runs of one pipeline version. Use a group to follow a set of runs, to limit the runs that run at the same time, and to get one event when all runs finish.

- `createPipelineGroup(client, { pipeline_id, version?, runs?, close?, max_in_flight?, external_id?, metadata? }, { idempotencyKey })` returns `{ group, created }`. `runs` has 0–1000 entries for distinct files: `{ file_id, external_id?, metadata? }`. A run does not get the metadata of its group.
- `max_in_flight` is 1–100000 (default 100). The other runs stay `pending` and start oldest first.
- To change the limit, use `updatePipelineGroup(client, id, { max_in_flight })` or `editframe pipelines groups update GROUP_ID --max-in-flight N`. You can change it in all group statuses. When you raise it, waiting runs start immediately. When you lower it, running runs continue.
- Editframe records each close and each change of `max_in_flight` with the API key or user that made it. The dashboard shows this change history. A change to the current value records nothing.
- To add a run later, call `createPipelineRun` with `group_id`. The run uses the version of the group. Errors: `404 group_not_found`, `409 group_closed`, and `409 group_version_mismatch` when `pipeline_id` or `version` is different from the group.
- Group statuses: `open` (accepts runs), `closed` (accepts no runs, and some runs did not finish) and `completed` (closed, and all runs finished).
- An open group does not complete. Call `closePipelineGroup(client, id)` after the last run, or create the group with `close: true`. A group whose runs all finished completes when you close it.
- A retry of a run in a completed group makes the group `closed` again. `completion_count` counts the completions.
- `listPipelineGroups(client, { status, pipeline_id, metadata })` and `getPipelineGroup(client, id)` return groups with run counts.
- `getPipelineGroupReport(client, id)` returns the run counts for each status, `queue_wait_ms` and `run_duration_ms` (`p50`, `p95`, `max`), input `media_minutes`, `step_failures` with the five most frequent error codes, and `usage`.

Runs and steps:
- Run statuses: `pending`, `running`, `succeeded`, `failed`, `filtered`, `cancelled`. `filtered` means that filters or reviews stopped all branches before their final steps. It is not an error. A run with a stopped branch and a successful final step ends `succeeded`.
- Step statuses: `pending`, `ready`, `running`, `waiting_external`, `waiting_review`, `succeeded`, `failed`, `skipped`, `cancelled`.
- Each step or window has 3 attempts. The retry delay starts at 10 seconds and doubles up to 10 minutes.
- `cancelPipelineRun` returns `409 run_not_cancellable` for a run that succeeded, failed or ended `filtered`.
- `retryPipelineRun` works only on `failed` and `cancelled` runs. Other runs return `409 run_not_retryable`. Succeeded steps keep their outputs.
- `getPipelineRunOutputs(client, runId, namespace)` returns pages of outputs, one for each window of a segment step.
- `getFilePipelineMetadata(client, fileId, namespace)` returns the latest outputs on a file from any run.
- Failed requests throw `PipelineApiError` with `status`, `code` and `issues` (`[{ path, code }]`).

To start a run before an upload finishes, upload with `uploadFragmented` from `@editframe/api/pipelines/upload`. Start the run in `onCreated`. Segment steps then process each window when its media arrives.

```typescript
import { uploadFragmented } from "@editframe/api/pipelines/upload";

await uploadFragmented(client, "dashcam.mp4", {
  onCreated: async (file) => {
    await createPipelineRun(client, { pipeline_id: pipelineId, file_id: file.id }, { idempotencyKey: `upload:${file.id}` });
  },
});
```

For pipeline webhook topics, see the `webhooks` skill.

### Pause a Pipeline

To stop new work and keep the runs, pause the pipeline. A pause applies to all versions of the pipeline.

```typescript
import { pausePipeline, resumePipeline } from "@editframe/api/pipelines";

const paused = await pausePipeline(client, pipelineId); // paused.paused_at is the time of the pause.
await resumePipeline(client, pipelineId); // paused_at is null again.
```

- A paused pipeline accepts new versions, runs and groups. New runs stay `pending`.
- No run, step, attempt or segment window starts until you resume the pipeline.
- Attempts that started before the pause continue. Editframe records their endpoint callbacks and review decisions.
- A step that did not start gets no deadline, so the pause does not cause a timeout.
- You can cancel and retry runs. A retried run stays `pending` until you resume the pipeline.
- When you resume the pipeline, the waiting runs and steps start immediately.
- A second pause or a second resume changes nothing and records nothing. An archived pipeline returns `409 pipeline_archived`.
- Editframe records each pause and resume with the API key or user that made it. The dashboard shows this change history.
- Pause and resume send no webhooks. A run that does not start records no usage.
- `listPipelines(client, { paused: true })` returns only paused pipelines.

### Pipelines CLI

`editframe pipelines` calls the cloud API directly. It reads the API key from `EDITFRAME_TOKEN`. It does not use `--project`, `--bridge` or the other runtime options.

```bash
export EDITFRAME_TOKEN="$EDITFRAME_API_KEY"
npx editframe pipelines create speech-check --definition speech-check.json
npx editframe pipelines runs create PIPELINE_ID FILE_ID --watch
npx editframe pipelines upload dashcam.mp4 --run PIPELINE_ID --watch
npx editframe pipelines reviews approve REVIEW_ID --patch corrections.json
npx editframe pipelines pause PIPELINE_ID
npx editframe pipelines resume PIPELINE_ID
```

- `--watch` exits with status 1 when the run fails or is cancelled.
- `--json` prints the API responses as JSON.
- Run `npx editframe pipelines --help` for all commands.

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
| `-o, --output <value>` | — | MP4 file that render writes (default output.mp4) |

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
| `editframe pipelines` | Manage cloud pipelines, runs, groups and reviews (preview) |
| `editframe projects` | List accessible projects |
| `editframe render` | Render a composition to an MP4 through the local runtime and headless Chrome |
| `editframe start` | Start the installed local bridge for a project |
| `editframe status` | Show local bridge status |
| `editframe stop` | Stop the project's local bridge |
