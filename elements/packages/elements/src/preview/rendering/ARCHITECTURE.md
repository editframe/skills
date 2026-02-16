# SVG ForeignObject Rendering Pipeline Architecture

This document captures architectural requirements and constraints for the canvas foreignObject rendering pipeline, derived from systematic benchmarking (POC v4, Methods A through O).

All performance data was collected in Chrome on macOS. Benchmark conditions: 8 canvases at 1920x1440, 50 DOM elements, 10 iterations unless noted.

## Terminology

- **Source canvas**: An on-screen canvas element whose content must be embedded in the SVG foreignObject.
- **Display resolution**: The size at which a source canvas is rendered within the SVG (typically smaller than source resolution).
- **Encoder worker**: A Web Worker that receives an ImageBitmap and produces a JPEG data URL.
- **Assembly worker**: A Web Worker that concatenates SVG markup and performs base64 encoding.
- **Pipeline depth**: The number of frames in flight simultaneously (1 = no pipelining, 2 = single-frame lookahead).

---

## 1. Canvas Content Capture

### 1.1 ImageBitmap Transfer

Implementations MUST use `createImageBitmap(canvas)` to capture canvas content for worker transfer. Implementations MUST NOT use `canvas.toDataURL()` or `canvas.getImageData()` for this purpose.

**Rationale**: `createImageBitmap()` completes in ~0.04ms per canvas and produces a transferable object (zero-copy via `postMessage` transfer list). `toDataURL()` blocks the main thread for 70-80ms per 1920x1440 canvas (PNG encoding on the main thread). This single decision accounts for a 750x reduction in main thread blocking.

| Method | Main thread cost per canvas (1920x1440) |
|--------|----------------------------------------|
| `createImageBitmap()` | ~0.05ms |
| `toDataURL('image/png')` | ~70ms |

### 1.2 Bitmap Transfer

Implementations MUST include ImageBitmap objects in the `postMessage` transfer list. Transferring (not copying) an ImageBitmap is effectively free. Failing to include bitmaps in the transfer list causes a structured clone, which is significantly slower.

```js
// CORRECT — zero-copy transfer
worker.postMessage({ bitmap }, [bitmap]);

// INCORRECT — structured clone (slow)
worker.postMessage({ bitmap });
```

### 1.3 willReadFrequently

Implementations SHOULD NOT rely on the `willReadFrequently` canvas hint when using the ImageBitmap path. This hint improves `toDataURL()` and `getImageData()` by ~38% per canvas (forces CPU-backed canvas, avoiding GPU-to-CPU readback), but is irrelevant when using `createImageBitmap()`, which does not perform pixel readback on the main thread.

---

## 2. Image Encoding

### 2.1 Format Selection

Implementations MUST use JPEG encoding (`image/jpeg`) for canvas content embedded in SVG foreignObject. Implementations MUST NOT use PNG or WebP encoding for this purpose.

**Rationale**: Image format choice cascades through every downstream step (base64 encoding, SVG assembly, image loading). JPEG produces dramatically smaller output, and this size advantage compounds.

| Format | SVG size (8 canvases) | Encode time (parallel) | Total frame time |
|--------|----------------------|----------------------|-----------------|
| PNG | 29,082 KB | baseline | 1,326 ms |
| JPEG | 416 KB (70x smaller) | ~30 ms | 34 ms |
| WebP | 551 KB (1.3x JPEG) | ~103 ms (3.4x JPEG) | 106 ms |
| BMP | 4,816 KB (12x JPEG) | ~2 ms encode, ~59 ms total | 59 ms |

WebP encoding in `OffscreenCanvas.convertToBlob()` is 3-5x slower than JPEG and produces larger output at equivalent quality. BMP skips compression but the raw data size (1.2MB per 1920x1440 canvas) cascades catastrophically through base64 encoding and SVG assembly.

### 2.2 JPEG Quality

Implementations SHOULD use a JPEG quality of 0.85 for preview rendering. This provides visually acceptable quality for interactive preview while keeping data sizes small. Implementations MAY reduce quality further (0.6-0.7) for scrubbing or seek operations where frame persistence is brief.

### 2.3 Encoding Location

Implementations MUST perform image encoding in Web Workers using `OffscreenCanvas.convertToBlob()`. Implementations MUST NOT perform image encoding on the main thread.

```js
// In worker:
const oc = new OffscreenCanvas(width, height);
const ctx = oc.getContext('2d');
ctx.drawImage(bitmap, 0, 0, width, height);
const blob = await oc.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
```

### 2.4 Resize Before Encode

When the display resolution is smaller than the source canvas resolution, implementations MUST resize the bitmap to display resolution before encoding. Implementations MUST NOT encode at source resolution when the display is smaller.

**Rationale**: This is the single largest performance lever after moving encoding off the main thread. Encoding at display resolution (e.g., 640x480) instead of source resolution (1920x1440) reduces pixel count by 9x, which cascades through encode time, data URL size, SVG size, base64 encoding time, and image load time.

| Approach | SVG size | Total frame time |
|----------|----------|-----------------|
| Encode at source (1920x1440) | 416 KB | 34.4 ms |
| Encode at display (~640x480) | 124 KB | 15.7 ms |

The resize is performed in the worker via `ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight)` on a smaller OffscreenCanvas before calling `convertToBlob()`. This adds negligible cost (~0.1ms) compared to the savings.

---

## 3. Parallelism

### 3.1 Per-Canvas Parallel Encoding

Implementations MUST encode each canvas in a separate dedicated worker. Implementations MUST NOT encode canvases sequentially in a single worker.

**Rationale**: At 1920x1440, sequential JPEG encoding of 8 canvases takes ~130ms in a single worker. Parallel encoding across 8 workers reduces this to ~30ms — near-linear speedup. Even at display resolution, parallel encoding provides measurable benefit.

| Strategy | Total frame time (8 canvases, 1920x1440) |
|----------|----------------------------------------|
| 1 worker, sequential | 140 ms (Method F) |
| 8 workers, parallel | 34 ms (Method I) |

### 3.2 Worker Pool Management

Implementations MUST pre-warm and reuse worker pools. Workers SHALL be created once and retained for the lifetime of the rendering session. Implementations MUST NOT create new workers per frame.

The worker pool MUST contain:
- N encoder workers, where N equals the maximum number of simultaneous canvases
- 1 assembly worker for SVG concatenation and base64 encoding

### 3.3 Frame Pipelining

Implementations SHOULD pipeline frame processing with a depth of 2 (single-frame lookahead). While workers process frame N (encode + assemble), the main thread captures ImageBitmaps for frame N+1 and dispatches them.

**Rationale**: Pipelining overlaps the main thread's bitmap capture (~0.5ms) and display (~0.5ms) with the workers' encode + assemble time (~10ms). The throughput improvement ranges from 14% (when worker time is already small due to resize) to 44% (when worker time dominates at full resolution).

| Method | Total/frame | fps | Main blocking |
|--------|-------------|-----|--------------|
| M (parallel + resize, no pipeline) | 12.6 ms | ~79 | 0.8 ms |
| O (parallel + resize + pipeline) | 10.8 ms | 93.4 | 0.5 ms |

Implementations MUST NOT use pipeline depths greater than 2. Deeper pipelines increase memory pressure (multiple sets of ImageBitmaps in flight) without meaningful throughput improvement, since the bottleneck is worker encode time, not main thread dispatch time.

---

## 4. SVG Assembly

### 4.1 Assembly Location

SVG string concatenation and base64 encoding MUST be performed in a dedicated assembly worker. These operations MUST NOT run on the main thread.

The assembly worker receives an array of JPEG data URL strings (from encoder workers) and DOM XHTML markup, concatenates them into an SVG foreignObject string, base64-encodes the result, and transfers the encoded data URI back as an ArrayBuffer.

### 4.2 Data Transfer Format

The assembly worker MUST return the SVG data URI as a UTF-8-encoded ArrayBuffer via the `postMessage` transfer list (zero-copy). The main thread decodes this with `new TextDecoder().decode(buffer)`.

```js
// In assembly worker:
const dataUri = 'data:image/svg+xml;base64,' + btoa(binary);
const bytes = new TextEncoder().encode(dataUri);
self.postMessage({ buffer: bytes.buffer }, [bytes.buffer]);

// On main thread:
const dataUri = new TextDecoder().decode(result.buffer);
```

### 4.3 Blob URLs

Implementations SHOULD NOT use blob URLs for SVG loading in place of data URIs. While blob URLs skip the base64 encoding step, benchmarking shows no meaningful improvement in total frame time and slightly increased main thread blocking (Blob constructor + `URL.createObjectURL()` run on the main thread).

| Approach | Total frame time | Main blocking |
|----------|-----------------|--------------|
| Data URI (base64) | 34.4 ms | 0.9 ms |
| Blob URL | 35.3 ms | 1.1 ms |

### 4.4 Base64 Encoding in Workers

The `btoa()` call for SVG base64 encoding MUST run inside the assembly worker. For a 416KB SVG, `btoa()` takes ~5-8ms. While this is not the primary bottleneck, it would add to main thread blocking if performed there.

The binary string construction before `btoa()` SHOULD use chunked `String.fromCharCode.apply()` with a chunk size of 8192 bytes to avoid call stack overflow:

```js
const bytes = new TextEncoder().encode(svgString);
let binary = '';
for (let i = 0; i < bytes.length; i += 8192) {
  binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
}
const base64 = btoa(binary);
```

---

## 5. Constraints and Dead Ends

### 5.1 SVG Security Sandbox

SVG content rendered via `<img>` tags operates in a security sandbox. The following constraints are absolute and MUST NOT be worked around:

- **No external resource requests**: SVG-as-image cannot load external URLs, including blob URLs created for embedded resources. All embedded content (images, fonts) MUST use inline data URIs.
- **No script execution**: JavaScript within SVG-as-image is not executed.
- **No cross-origin resources**: Even same-origin resources are blocked when the SVG is loaded as an image.

### 5.2 createImageBitmap with SVG

Implementations MUST NOT attempt to use `createImageBitmap()` to decode SVG blobs containing foreignObject content in workers. This fails with "The source image could not be decoded." The browser's SVG rasterizer does not support foreignObject content when invoked via `createImageBitmap()` — it requires the full HTML rendering engine, which is only available through the `<img>` element load path on the main thread.

### 5.3 Worker Blob URL Scope

Blob URLs created via `URL.createObjectURL()` in a worker are scoped to that worker's global and are NOT accessible from the main thread or other workers. If blob URLs are needed on the main thread, the raw data MUST be transferred back and the blob URL created on the main thread.

### 5.4 WebP Encoding Performance

`OffscreenCanvas.convertToBlob({ type: 'image/webp' })` in Chrome is 3-5x slower than JPEG encoding and produces 30% larger output at equivalent quality settings. WebP's compression advantage over JPEG does not materialize in the `convertToBlob()` implementation. This may change in future browser versions but as of Chrome 133+, JPEG is strictly superior for this use case.

---

## 6. Performance Budget

The following table summarizes the per-frame time budget for Method O (the recommended architecture) at 8 canvases, 1920x1440 source, display resolution encoding:

| Phase | Location | Time | Blocking? |
|-------|----------|------|-----------|
| createImageBitmap (x8) | Main thread | 0.36 ms | Yes |
| Resize + JPEG encode (x8) | 8 encoder workers (parallel) | ~8 ms | No |
| SVG assembly + btoa | Assembly worker | ~2 ms | No |
| ArrayBuffer transfer | postMessage | ~0 ms | No |
| TextDecoder | Main thread | ~0.02 ms | Yes |
| Image load (SVG decode) | Browser (async) | 0.13 ms | No |
| drawImage | Main thread | 0.09 ms | Yes |
| **Total** | | **10.8 ms** | |
| **Main thread blocking** | | **0.48 ms** | |

This leaves 22ms of headroom within a 33ms (30fps) frame budget for DOM serialization, animation updates, and other frame work.

---

## 7. Architecture Summary

```
Main Thread (0.5ms/frame)          Workers (10ms/frame, overlapped)
─────────────────────────          ──────────────────────────────────

createImageBitmap() x N  ─────►   Encoder Worker 0: resize → JPEG → data URL
         (0.35ms)        ─────►   Encoder Worker 1: resize → JPEG → data URL
                         ─────►   Encoder Worker N: resize → JPEG → data URL
                                           │
                                           ▼
                                  Assembly Worker: concat SVG + btoa
                                           │
                         ◄─────────────────┘ (ArrayBuffer transfer)

TextDecoder (0.02ms)
loadImage (async, ~0.1ms)
drawImage (0.09ms)

Pipeline: while workers process frame N,
main thread captures bitmaps for frame N+1
```

### Optimization Impact (cumulative, 8 canvases @ 1920x1440)

| Optimization | Total | Main | Improvement |
|-------------|-------|------|-------------|
| Baseline (all main thread, PNG) | 1,327 ms | 804 ms | — |
| + JPEG encoding | — | — | ~3x smaller SVG |
| + Worker encoding | 140 ms | 1.1 ms | 9.5x total, 730x main |
| + Parallel workers | 34 ms | 0.9 ms | 4x total over single worker |
| + Resize before encode | 16 ms | 0.9 ms | 2.2x total over full-res |
| + Frame pipelining | **10.8 ms** | **0.5 ms** | **123x total, 1,675x main** |
