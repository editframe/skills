---
description: Submit Editframe compositions to the cloud render pipeline and download completed videos without local ffmpeg.
metadata:
  author: editframe
  version: 0.45.7
---


# Cloud Rendering

Render compositions in Editframe's cloud infrastructure. Requires an API token.

## cloud-render

```bash
npx editframe cloud-render [directory] [options]
```

Builds the project into a self-contained bundle, syncs media assets, and submits a render job to the cloud.

### Options

- `-s, --strategy <strategy>` — Render strategy (default: `v1`)

### How It Works

The command runs these steps in sequence:

**1. Sync pre-processed assets** — uploads ISOBMFF video tracks, images, and captions from `src/assets/.cache` to Editframe's CDN. These are the processed media files produced by `npx editframe process`.

**2. Vite build** — runs `vite build` on the project directory. The project's `vite.config.ts` includes `vite-plugin-singlefile`, which inlines all JavaScript and CSS into `dist/index.html` as a single self-contained HTML file. For React projects, this means the entire component tree, styles (including Tailwind), and the `@editframe/react` runtime are embedded in the HTML.

**3. Load the built page in headless Chrome** — starts a static preview server from `dist/`, then launches Playwright and waits for the Editframe SDK to initialize (`window.EF_REGISTERED`).

**4. Extract render metadata** — calls `getRenderInfo()` in the page context to read the composition's `width`, `height`, `fps`, and `durationMs` from the live DOM.

**5. Rewrite asset references** — parses `dist/index.html` and replaces any `src` attributes on `ef-video`, `ef-audio`, and `ef-image` elements with `file-id` attributes pointing to the already-uploaded CDN assets.

**6. Create the render job** — calls `createRender` with the composition dimensions and an MD5 of the `dist/` directory for deduplication.

**7. Upload the bundle** — tarballs the entire `dist/` directory (with `dist/index.html` at the root) and uploads it to the render API. The cloud renderer serves this bundle, loads it in headless Chrome, and captures frames.

### Bundle format

The cloud renderer expects a `.tar.gz` archive with `index.html` at the root. All JS and CSS must be inlined — no external script or link references. `vite-plugin-singlefile` handles this automatically in the project templates.

The resulting `dist/index.html` is a fully self-contained page: Editframe elements, React, Tailwind styles, and your composition code are all embedded inline.

## sync

```bash
npx editframe sync [directory]
```

Syncs pre-processed assets from `src/assets/.cache` to Editframe servers. `cloud-render` calls this automatically, but you can run it independently to pre-upload assets before a render.

## process

```bash
npx editframe process [directory]
```

Builds the project and processes assets for cloud rendering. Runs `vite build` then loads the page in headless Chrome to discover media assets, then generates ISOBMFF tracks for video files and caches images and captions under `src/assets/.cache`.

Run this before `cloud-render` when you have new or changed media files.

## process-file

```bash
npx editframe process-file <file>
```

Uploads a single audio/video file to Editframe for processing. Shows upload progress and waits for processing to complete.

## Authentication

All cloud commands require an API token. Set it via:

```bash
npx editframe --token <your-token> cloud-render
```

Or set the `EF_TOKEN` environment variable:

```bash
export EF_TOKEN=your-token
npx editframe cloud-render
```

Verify your token:

```bash
npx editframe auth
```
