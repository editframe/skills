---
title: Local Assets API
description: Local development endpoints for asset management, image thumbnail caching, and automatic caption file generation.
type: reference
nav:
  parent: "Features"
  priority: 30
api:
  endpoints:
    - path: /api/v1/assets/image
      method: GET
      description: Caches and serves a local or remote image file
    - path: /api/v1/assets/captions
      method: GET
      description: Generates or retrieves cached captions for an audio/video file
---

# Local Assets API

The plugin serves local images and captions through endpoints that mirror the production asset API. This allows compositions to use the same asset-fetching logic in both development and production without conditional paths.

## Image Caching

The image endpoint caches and serves image files with proper MIME types and ETags:

```
GET /api/v1/assets/image?src=assets/background.png
```

The `src` parameter accepts both local paths (resolved relative to the plugin `root` directory) and remote `http`/`https` URLs. Remote images are fetched server-side and returned as same-origin responses, preventing canvas CORS taint when compositions serialize to image. Local files are processed through `cacheImage(cacheRoot, absolutePath)` and served with an MD5-based ETag.

## Caption Generation

The captions endpoint generates or retrieves cached transcription data for audio and video files:

```
GET /api/v1/assets/captions?src=assets/interview.mp4
```

This calls `findOrCreateCaptions(cacheRoot, absolutePath)` which either returns existing cached captions or generates new ones using the assets package transcription pipeline. The result is served as JSON with cache headers.

## Path Resolution

All `src` parameters follow the same resolution logic:

1. If `src` starts with `http://` or `https://`, it is fetched server-side and proxied to the browser as same-origin
2. Otherwise, `src` is joined with the plugin `root` option
3. Any `dist/` prefix in the resolved path is replaced with `src/` to support source-mapped development

```typescript
// Example: root = "./dev-projects/src"
// src = "assets/photo.jpg"
// Resolved: ./dev-projects/src/assets/photo.jpg
```

## Response Format

All asset responses are streamed from the cache with:

- **Content-Type** determined by file extension via the `mime` package
- **ETag** set to the MD5 hash of the cached file
- **Cache-Control** set to `max-age=3600`
- **Range request** support for partial content (HTTP 206)

## Error Handling

- Missing `src` parameter returns `400` with `{ error: "src parameter is required" }`
- File not found returns `404` with plain text body
- Other errors return `500` with `{ error: "..." }` JSON

## Debug Logging

```bash
DEBUG=ef:vite-plugin:assets npm run dev
```
