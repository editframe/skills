# Function-Level Performance Analysis

**Generated:** 2026-01-25T10:45:19.085Z
**Profile File:** video-worker-pool-5sec.cpuprofile

---

## Performance Summary

| Metric | Value |
|--------|-------|
| Profile Time | 25236.3ms |
| Total Samples | 133,098 |
| Sampling Interval | 189.60656057942268μs (0.2ms) |

### Data Quality Assessment

✅ **Excellent** - 133,098 samples provide high statistical confidence

## Top 20 Files by Self Time

Self time = time spent executing code in the file itself (not in functions it calls)

| Rank | Self Time | Self % | Samples | File |
|------|-----------|--------|---------|------|
| 1 | 23009.7ms | 91.2% | 121,355 | `(native)` |
| 2 | 354.6ms | 1.4% | 1,870 | `mediabunny.js` |
| 3 | 256.2ms | 1.0% | 1,351 | `SerializationWorkerPool.ts` |
| 4 | 206.5ms | 0.8% | 1,089 | `renderToImage.ts` |
| 5 | 185.8ms | 0.7% | 980 | `renderTimegroupPreview.ts` |
| 6 | 150.7ms | 0.6% | 795 | `waveformUtils.ts` |
| 7 | 135.6ms | 0.5% | 715 | `EFTemporal.ts` |
| 8 | 131.8ms | 0.5% | 695 | `renderTimegroupToVideo.ts` |
| 9 | 97.6ms | 0.4% | 515 | `chunk-L4R6EZIQ.js` |
| 10 | 92.9ms | 0.4% | 490 | `chunk-JOMJT2WW.js` |
| 11 | 79.3ms | 0.3% | 418 | `EFTimegroup.ts` |
| 12 | 78.5ms | 0.3% | 414 | `frameSerializationHelpers.ts` |
| 13 | 59.9ms | 0.2% | 316 | `updateAnimations.ts` |
| 14 | 41.1ms | 0.2% | 217 | `EFOverlayLayer.ts` |
| 15 | 30.5ms | 0.1% | 161 | `EFCanvas.ts` |
| 16 | 26.4ms | 0.1% | 139 | `makeAudioInputTask.ts` |
| 17 | 24.1ms | 0.1% | 127 | `EFTimeline.ts` |
| 18 | 19.9ms | 0.1% | 105 | `EFText.ts` |
| 19 | 19.2ms | 0.1% | 101 | `EFTimelineRow.ts` |
| 20 | 16.1ms | 0.1% | 85 | `@lit_task.js` |

## Top 20 Functions by Self Time

Self time = time spent in the function itself (not in functions it calls)

| Rank | Self Time | Self % | Samples | Function | Location |
|------|-----------|--------|---------|----------|----------|
| 1 | 232.1ms | 0.9% | 1,224 | `(anonymous)` | `SerializationWorkerPool.ts:169` |
| 2 | 195.7ms | 0.8% | 1,032 | `(anonymous)` | `renderToImage.ts:10` |
| 3 | 149.2ms | 0.6% | 787 | `extractPeaksFromBuffer` | `waveformUtils.ts:42` |
| 4 | 131.4ms | 0.5% | 693 | `renderTimegroupToVideo` | `renderTimegroupToVideo.ts:149` |
| 5 | 51.6ms | 0.2% | 272 | `syncNodeStyles` | `renderTimegroupPreview.ts:323` |
| 6 | 48.9ms | 0.2% | 258 | `serializeToHtmlString` | `frameSerializationHelpers.ts:25` |
| 7 | 46.1ms | 0.2% | 243 | `syncNodeStyles` | `renderTimegroupPreview.ts:323` |
| 8 | 32.8ms | 0.1% | 173 | `readTransform` | `EFOverlayLayer.ts:40` |
| 9 | 26.2ms | 0.1% | 138 | `task` | `makeAudioInputTask.ts:22` |
| 10 | 25.0ms | 0.1% | 132 | `(anonymous)` | `frameSerializationHelpers.ts:4` |
| 11 | 23.7ms | 0.1% | 125 | `messageHandler` | `SerializationWorkerPool.ts:173` |
| 12 | 15.2ms | 0.1% | 80 | `syncNodeStyles` | `renderTimegroupPreview.ts:323` |
| 13 | 13.7ms | 0.1% | 72 | `syncNodeStyles` | `renderTimegroupPreview.ts:323` |
| 14 | 12.7ms | 0.1% | 67 | `task` | `makeScrubVideoInputTask.ts:24` |
| 15 | 11.6ms | 0.0% | 61 | `walk` | `EFTimegroup.ts:1208` |
| 16 | 9.9ms | 0.0% | 52 | `extractSegmentThumbnails` | `ThumbnailExtractor.ts:90` |
| 17 | 8.7ms | 0.0% | 46 | `collectDocumentStyles` | `renderTimegroupPreview.ts:507` |
| 18 | 8.2ms | 0.0% | 43 | `update` | `EFOverlayLayer.ts:63` |
| 19 | 7.4ms | 0.0% | 39 | `shallowGetTemporalElements` | `EFTemporal.ts:195` |
| 20 | 7.2ms | 0.0% | 38 | `setupResizeObserver` | `EFTimeline.ts:419` |

## Top 20 Functions by Total Time

Total time = time spent in the function including all functions it calls

| Rank | Total Time | Total % | Self Time | Function | Location |
|------|------------|---------|-----------|----------|----------|
| 1 | 10504.4ms | 41.6% | 131.4ms | `renderTimegroupToVideo` | `renderTimegroupToVideo.ts:149` |
| 2 | 8796.0ms | 34.9% | 3.2ms | `extractCanvasData` | `frameSerializationHelpers.ts:1` |
| 3 | 8791.9ms | 34.8% | 25.0ms | `(anonymous)` | `frameSerializationHelpers.ts:4` |
| 4 | 493.7ms | 2.0% | 0.0ms | `_captureVideoThumbnails` | `EFThumbnailStrip.ts:675` |
| 5 | 492.4ms | 2.0% | 0.0ms | `_canvasToImageData` | `EFThumbnailStrip.ts:711` |
| 6 | 424.7ms | 1.7% | 0.2ms | `(anonymous)` | `EFText.ts:369` |
| 7 | 424.5ms | 1.7% | 0.6ms | `updateAnimations` | `updateAnimations.ts:442` |
| 8 | 380.4ms | 1.5% | 0.0ms | `updated` | `EFTimelineRuler.ts:115` |
| 9 | 380.4ms | 1.5% | 0.8ms | `renderCanvas` | `EFTimelineRuler.ts:168` |
| 10 | 345.3ms | 1.4% | 1.3ms | `(anonymous)` | `updateAnimations.ts:449` |
| 11 | 319.1ms | 1.3% | 0.0ms | `applyAnimationCoordination` | `updateAnimations.ts:431` |
| 12 | 319.1ms | 1.3% | 1.7ms | `coordinateElementAnimations` | `updateAnimations.ts:404` |
| 13 | 298.3ms | 1.2% | 4.7ms | `discoverAndTrackAnimations` | `updateAnimations.ts:35` |
| 14 | 235.3ms | 0.9% | 0.0ms | `serializeFrame` | `SerializationWorkerPool.ts:160` |
| 15 | 235.3ms | 0.9% | 0.4ms | `execute` | `WorkerPool.ts:89` |
| 16 | 234.7ms | 0.9% | 0.2ms | `(anonymous)` | `WorkerPool.ts:96` |
| 17 | 234.5ms | 0.9% | 0.6ms | `processQueue` | `WorkerPool.ts:105` |
| 18 | 234.0ms | 0.9% | 0.2ms | `(anonymous)` | `SerializationWorkerPool.ts:168` |
| 19 | 233.8ms | 0.9% | 232.1ms | `(anonymous)` | `SerializationWorkerPool.ts:169` |
| 20 | 226.8ms | 0.9% | 0.0ms | `(anonymous)` | `EFTimegroup.ts:301` |

## Most Frequently Sampled Functions

Functions that appeared most often in profiling samples (may indicate hot loops or frequently called code)

| Rank | Samples | Sample % | Avg Time/Sample | Function | Location |
|------|---------|----------|-----------------|----------|----------|
| 1 | 1,224 | 0.92% | 0.190ms | `(anonymous)` | `SerializationWorkerPool.ts:169` |
| 2 | 1,032 | 0.78% | 0.190ms | `(anonymous)` | `renderToImage.ts:10` |
| 3 | 787 | 0.59% | 0.190ms | `extractPeaksFromBuffer` | `waveformUtils.ts:42` |
| 4 | 693 | 0.52% | 0.190ms | `renderTimegroupToVideo` | `renderTimegroupToVideo.ts:149` |
| 5 | 272 | 0.20% | 0.190ms | `syncNodeStyles` | `renderTimegroupPreview.ts:323` |
| 6 | 258 | 0.19% | 0.190ms | `serializeToHtmlString` | `frameSerializationHelpers.ts:25` |
| 7 | 243 | 0.18% | 0.190ms | `syncNodeStyles` | `renderTimegroupPreview.ts:323` |
| 8 | 173 | 0.13% | 0.190ms | `readTransform` | `EFOverlayLayer.ts:40` |
| 9 | 138 | 0.10% | 0.190ms | `task` | `makeAudioInputTask.ts:22` |
| 10 | 132 | 0.10% | 0.190ms | `(anonymous)` | `frameSerializationHelpers.ts:4` |
| 11 | 125 | 0.09% | 0.190ms | `messageHandler` | `SerializationWorkerPool.ts:173` |
| 12 | 80 | 0.06% | 0.190ms | `syncNodeStyles` | `renderTimegroupPreview.ts:323` |
| 13 | 72 | 0.05% | 0.190ms | `syncNodeStyles` | `renderTimegroupPreview.ts:323` |
| 14 | 67 | 0.05% | 0.190ms | `task` | `makeScrubVideoInputTask.ts:24` |
| 15 | 61 | 0.05% | 0.190ms | `walk` | `EFTimegroup.ts:1208` |
| 16 | 52 | 0.04% | 0.190ms | `extractSegmentThumbnails` | `ThumbnailExtractor.ts:90` |
| 17 | 46 | 0.03% | 0.190ms | `collectDocumentStyles` | `renderTimegroupPreview.ts:507` |
| 18 | 43 | 0.03% | 0.190ms | `update` | `EFOverlayLayer.ts:63` |
| 19 | 39 | 0.03% | 0.190ms | `shallowGetTemporalElements` | `EFTemporal.ts:195` |
| 20 | 38 | 0.03% | 0.190ms | `setupResizeObserver` | `EFTimeline.ts:419` |

## Key Findings

### Top Hotspot

**Function:** `(anonymous)`
**Location:** `SerializationWorkerPool.ts:169`
**Self Time:** 232.1ms (0.9% of profile)
**Total Time:** 233.8ms (0.9% of profile)
**Samples:** 1,224

This function is the single biggest performance bottleneck in our code.

### Top 3 Functions

The top 3 functions account for **577.0ms (2.3%)** of total profile time:

1. `(anonymous)` - 232.1ms @ `SerializationWorkerPool.ts:169`
2. `(anonymous)` - 195.7ms @ `renderToImage.ts:10`
3. `extractPeaksFromBuffer` - 149.2ms @ `waveformUtils.ts:42`

## Optimization Recommendations

Based on the profiling data, focus optimization efforts on:

### 1. (anonymous)

- **Impact:** 232.1ms (0.9% of profile)
- **Location:** `SerializationWorkerPool.ts:169`
- **Recommendation:** Investigate and optimize this function

### 2. (anonymous)

- **Impact:** 195.7ms (0.8% of profile)
- **Location:** `renderToImage.ts:10`
- **Recommendation:** Investigate and optimize this function

### 3. extractPeaksFromBuffer

- **Impact:** 149.2ms (0.6% of profile)
- **Location:** `waveformUtils.ts:42`
- **Recommendation:** Investigate and optimize this function

### 4. renderTimegroupToVideo

- **Impact:** 131.4ms (0.5% of profile)
- **Location:** `renderTimegroupToVideo.ts:149`
- **Recommendation:** Investigate and optimize this function

### 5. syncNodeStyles

- **Impact:** 51.6ms (0.2% of profile)
- **Location:** `renderTimegroupPreview.ts:323`
- **Recommendation:** Investigate and optimize this function

## Source Map Validation

✅ **Source maps working correctly**

- Found 1807 TypeScript functions in profile
- Line numbers are being mapped from compiled JavaScript back to TypeScript
- Can identify exact functions and locations for optimization

## Next Steps

1. **Review top hotspots** - Examine the top 5 functions for optimization opportunities
2. **Measure impact** - After optimizing, re-run profiler to measure improvements
3. **Focus on high-value targets** - Prioritize functions with both high self time and high total time
4. **Check call patterns** - Look for functions called too frequently (high sample counts)

