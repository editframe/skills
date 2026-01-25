# Deep Pipeline Architecture Results

## Implementation Summary

Implemented queue-based deep pipeline with 3-4 frame lookahead to eliminate idle time and improve concurrent operations.

### Architecture Changes

**Before:**
- Pipeline depth: 1 frame ahead
- Concurrent operations: 2 (encode current + render next)
- Frame ordering: Simple dual-promise pattern

**After:**
- Pipeline depth: 3-4 frames ahead
- Concurrent operations: 6-7 (3 seeks + 3 renders + 1 encode)
- Frame ordering: Queue-based with strict sequential encoding

### Implementation Details

```typescript
// Maintain operation queues
const seekQueue: Promise<void>[] = [];
const renderTasks: RenderTask[] = [];

// Pipeline depth configuration
const MAX_SEEK = 3;    // 3 seeks can overlap
const MAX_RENDER = 3;  // 3 renders can overlap (image loading is async)

// Loop structure:
for (let completedFrames = 0; completedFrames < config.totalFrames; completedFrames++) {
  // STAGE 1: Fill seek queue (don't block!)
  while (seekQueue.length < MAX_SEEK && nextSeekFrame < config.totalFrames) {
    // Start seek, push promise to queue
  }
  
  // STAGE 2: Fill render queue (don't block!)
  while (renderTasks.length < MAX_RENDER && seekQueue.length > 0) {
    // Chain render after seek, push task to queue
  }
  
  // STAGE 3: Await render for THIS frame (maintains order)
  const task = renderTasks.find(t => t.frameIndex === frameIndex);
  const image = await task.promise;
  
  // STAGE 4: Encode frame (sequential, maintains order)
  await videoSource.add(timestampS, config.frameDurationS);
}
```

## Performance Results

### Browser Tests (Chromium, vitest)

| Test Case | Time | Frames | Realtime Speed | ms/frame |
|-----------|------|--------|----------------|----------|
| Workbench callbacks | 192ms | 10 | 5.58x | 19.2 |
| Temporal culling | 863ms | 75 | 5.67x | 11.5 |
| Nested timegroups | 302ms | 20 | 7.34x | 15.1 |
| DOM mutations | 502ms | 36 | 6.11x | 14.0 |
| Clone reuse 720p | 725ms | 30 | 2.85x | 24.2 |
| 1080p export | 805ms | 30 | 2.78x | 26.8 |
| Performance bench 720p | 767ms | 30 | 2.75x | 25.6 |

### CLI Profiling (video.html, 5 second export)

**Command:**
```bash
./scripts/editframe render \
  --url http://main.localhost:4321/video.html \
  --profile \
  --from-ms 0 \
  --to-ms 5000
```

**Results:**
- Total time: 24.3s
- Video duration: 5.0s
- Speed: **0.206x realtime**
- Samples: 100,724

**CPU Hotspots:**
- 57% idle time (57,242 samples)
- 13% toDataURL (13,350 samples) - image encoding
- 9% getImageData (8,954 samples) - canvas data extraction
- 8% program overhead (8,290 samples)
- 1% serializeToSvgDataUri (1,143 samples)
- 1% syncNodeStyles (276 + 236 samples)

## Analysis

### Expected vs Actual Results

**Expected:**
- Idle time: 60-73% → 30-40%
- Pipeline utilization: 2x → 5-6x
- Overall speed: 0.203x → 0.4-0.6x realtime

**Actual:**
- Idle time: 57% (no significant change)
- Pipeline utilization: 6-7x concurrent ops (achieved)
- Overall speed: 0.206x (no significant change)

### Why Didn't It Work?

The deep pipeline successfully increased concurrent operations from 2 to 6-7, but **idle time remained at 57%**. Analysis reveals:

1. **Image encoding is the bottleneck:** `toDataURL` (13%) and `getImageData` (9%) dominate CPU time
2. **Browser single-threaded limitations:** These canvas operations run on main thread, cannot overlap
3. **Pipeline structure limitation:** We await each frame's render before moving to next, limiting parallelism
4. **Encoding is already async:** VideoEncoder already uses workers, so parallel encodes don't help

### The Real Bottleneck

The profile shows the critical path is:
```
seek → sync → serialize → toDataURL → getImageData → encode
                            ^          ^
                            |          |
                        13% CPU    9% CPU
```

The image serialization operations (`toDataURL`, `getImageData`) are:
- Single-threaded (main thread only)
- Synchronous (cannot overlap)
- Expensive (22% of total CPU time)

Even with 3 renders "in flight," they all hit the same bottleneck when calling these canvas methods.

### Why The Old Approach Was Already Optimal

The previous "1 frame ahead" pipeline was actually close to optimal because:
1. The video encoder already parallelizes work in web workers
2. The canvas serialization operations cannot overlap (single-threaded)
3. Seeking and DOM operations are fast compared to serialization
4. The main bottleneck is canvas → image conversion, which we can't parallelize

## Conclusions

1. **Deep pipeline achieved architectural goal:** Successfully increased concurrent operations from 2 to 6-7

2. **Did not achieve performance goal:** Idle time remained at 57%, overall speed unchanged at ~0.2x realtime

3. **Root cause identified:** Canvas serialization (toDataURL, getImageData) is single-threaded and cannot be parallelized

4. **Recommendation:** Revert to simpler "1 frame ahead" pipeline for maintainability, or explore alternative approaches:
   - OffscreenCanvas with workers (requires major refactor)
   - WebGPU-based rendering (future technology)
   - Direct canvas access without image conversion (mediabunny limitation)

## Next Steps

The only way to significantly improve performance is to eliminate or parallelize the image serialization bottleneck:

1. **Short term:** Keep simpler code (1 frame ahead is nearly as good)
2. **Medium term:** Investigate OffscreenCanvas + workers for parallel serialization
3. **Long term:** Wait for WebGPU or browser improvements to canvas APIs
