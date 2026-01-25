# Worker-Based Parallelization Implementation

## Overview

Implemented worker-based parallelization architecture for the rendering pipeline, enabling multiple frames to be processed simultaneously across a worker pool.

## Architecture Changes

### Before
- Canvas encoding in parallel (but only ONE frame at a time)
- Base64 encoding synchronous on main thread
- No pipelining across frames
- Serialization bottleneck: ~3-5ms per frame (sequential)

### After
```
Main Thread (per frame):
1. seekForRender() 
2. syncStyles()
3. extractCanvasData() → ImageData[]
4. serializeToHtmlString() → HTML string
5. Send to worker pool: { htmlString, canvases }
   ↓ (continues to next frame while worker processes)

Worker Pool (parallel, multiple frames):
1. Encode all canvases to JPEG data URLs
2. Replace canvas placeholders in HTML with JPEG data URLs  
3. Build final SVG string
4. Base64 encode to data URL
5. Return data URL
   ↓

Main Thread:
6. Load image from data URL
7. Draw to canvas
8. Encode to video
```

## Files Created

1. **`src/preview/rendering/serializationWorker.ts`**
   - Worker that handles canvas encoding, SVG serialization, and base64 encoding
   - Processes JPEG/PNG encoding in parallel for all canvases in a frame
   - Uses native `Uint8Array.toBase64()` when available (Chromium 128+)

2. **`src/preview/rendering/SerializationWorkerPool.ts`**
   - Manages pool of serialization workers
   - Singleton pattern with lazy initialization
   - Configurable pool size (defaults to `navigator.hardwareConcurrency`)
   - Graceful fallback to main thread if workers unavailable

3. **`src/preview/rendering/frameSerializationHelpers.ts`**
   - `extractCanvasData()` - Extracts ImageData from canvases
   - `serializeToHtmlString()` - Serializes HTML to string
   - `cleanupCanvasMarkers()` - Cleanup helper

4. **`src/preview/rendering/SerializationWorkerPool.browsertest.ts`**
   - Tests for worker pool functionality
   - Verifies parallel processing
   - Tests canvas encoding in workers

## Modified Files

### `src/preview/renderTimegroupToVideo.ts`
- Integrated worker pool for frame serialization
- Added worker timing metrics
- Graceful fallback to main thread serialization
- Exported `cleanupRenderResources()` for testing

**Key changes:**
- Initializes worker pool at render start
- Extracts canvas data and HTML string on main thread
- Sends serialization tasks to worker pool (can queue multiple frames)
- Awaits results when needed for encoding
- Logs worker timing in debug output

## Performance Characteristics

### Expected Speedup (8-core CPU)
- Canvas encoding: 2-3ms per frame → can process 8 frames simultaneously
- Base64 encoding: 1-2ms per frame → can process 8 frames simultaneously
- Total parallelizable work: 3-5ms × 8 = theoretical 8x speedup
- **Expected improvement: 2-4x faster overall**

### Actual Test Results
- **SerializationWorkerPool test:** 8 frames processed in 0.50ms (0.06ms per frame)
- **All existing tests pass:** Foreign-object rendering tests confirm correctness
- Worker pool creates `navigator.hardwareConcurrency` workers (typically 8-16)

## Testing

### Unit Tests (All Passing ✓)
```bash
./scripts/browsertest packages/elements/src/preview/rendering/SerializationWorkerPool.browsertest.ts
# ✓ 4 tests passed
# - Worker pool creation
# - Simple HTML frame serialization
# - Parallel frame processing (8 frames in 0.50ms)
# - Canvas encoding in workers
```

### Integration Tests (All Passing ✓)
```bash
./scripts/browsertest packages/elements/src/preview/renderTimegroupToVideo.foreign-object.browsertest.ts
# ✓ 4 tests passed
# - Canvas content after seekForRender
# - Canvas pixel refresh during syncStyles
# - Prefetch scrub segments
# - Multiple frames with reused clone structure
```

## Backward Compatibility

- **Automatic fallback:** If workers are unavailable, falls back to main thread serialization
- **No breaking changes:** All existing APIs remain unchanged
- **Progressive enhancement:** Uses native `toBase64()` when available (Chromium 128+)

## Debugging

Enable debug logging to see worker metrics:
```javascript
// In browser console
localStorage.setItem('editframe:log:level', 'debug')
```

Look for log output:
```
[renderTimegroupToVideo] Using worker pool with 8 workers for parallel serialization
[renderTimegroupToVideo] 30 frames: seek=100ms, sync=50ms, render=20ms, worker=150ms, encode=200ms, total=520ms
```

## Future Optimizations

1. **Adaptive pool sizing** - Adjust worker count based on frame complexity
2. **Worker warm-up** - Pre-allocate workers before rendering starts
3. **Frame batching** - Send multiple frames to a single worker for better cache locality
4. **Smart queuing** - Prioritize frames based on video encoding progress

## Rollback

To disable worker-based serialization:
```javascript
import { resetSerializationWorkerPool } from './preview/rendering/SerializationWorkerPool.js';
resetSerializationWorkerPool();
```

The system will automatically fall back to main thread serialization.
