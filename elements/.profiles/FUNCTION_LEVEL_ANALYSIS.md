# Function-Level Performance Analysis

**Generated:** 2026-01-25T08:12:12.873Z
**Test File:** packages/elements/src/preview/renderTimegroupToCanvas.browsertest.ts
**Test Pattern:** batch

---

## Performance Summary

| Metric | Value |
|--------|-------|
| Wall Clock Time | 3335ms |
| Profile Time | 3037.7ms |
| Total Samples | 2,231 |
| Sampling Interval | 1361.5652173913043μs (1.4ms) |
| Coverage | 91.1% |

### Data Quality Assessment

✓ **Good** - 2,231 samples provide reasonable statistical confidence

## Top 20 Files by Self Time

Self time = time spent executing code in the file itself (not in functions it calls)

| Rank | Self Time | Self % | Samples | File |
|------|-----------|--------|---------|------|
| 1 | 2396.4ms | 78.9% | 1,760 | `(native)` |
| 2 | 285.9ms | 9.4% | 210 | `renderToImageNative.ts` |
| 3 | 81.7ms | 2.7% | 60 | `visualRegressionUtils.ts` |
| 4 | 64.0ms | 2.1% | 47 | `index-D_ryMEPs.js` |
| 5 | 35.4ms | 1.2% | 26 | `renderTimegroupToCanvas.browsertest.ts` |
| 6 | 20.4ms | 0.7% | 15 | `mediabunny.js` |
| 7 | 12.3ms | 0.4% | 9 | `chunk-IWWBZPJH.js` |
| 8 | 12.3ms | 0.4% | 9 | `chunk-hooks.js` |
| 9 | 10.9ms | 0.4% | 8 | `EFTemporal.ts` |
| 10 | 9.5ms | 0.3% | 7 | `EFVideo.ts` |
| 11 | 9.5ms | 0.3% | 7 | `@lit_task.js` |
| 12 | 9.5ms | 0.3% | 7 | `source-map.js` |
| 13 | 8.2ms | 0.3% | 6 | `EFTimegroup.ts` |
| 14 | 6.8ms | 0.2% | 5 | `chunk-6QPQ5RNJ.js` |
| 15 | 5.4ms | 0.2% | 4 | `trie.js` |
| 16 | 5.4ms | 0.2% | 4 | `vitest___@vitest_runner___strip-literal.js` |
| 17 | 5.4ms | 0.2% | 4 | `makeAudioTimeDomainAnalysisTask.ts` |
| 18 | 5.4ms | 0.2% | 4 | `renderTimegroupToCanvas.ts` |
| 19 | 4.1ms | 0.1% | 3 | `client.js` |
| 20 | 4.1ms | 0.1% | 3 | `EFMedia.ts` |

## Top 20 Functions by Self Time

Self time = time spent in the function itself (not in functions it calls)

| Rank | Self Time | Self % | Samples | Function | Location |
|------|-----------|--------|---------|----------|----------|
| 1 | 285.9ms | 9.4% | 210 | `renderToImageNative` | `renderToImageNative.ts:16` |
| 2 | 79.0ms | 2.6% | 58 | `captureCanvasAsDataUrl` | `visualRegressionUtils.ts:1` |
| 3 | 17.7ms | 0.6% | 13 | `hasCanvasContent` | `renderTimegroupToCanvas.browsertest.ts:345` |
| 4 | 16.3ms | 0.5% | 12 | `hasCanvasContent` | `renderTimegroupToCanvas.browsertest.ts:345` |
| 5 | 6.8ms | 0.2% | 5 | `(anonymous)` | `EFVideo.ts:261` |
| 6 | 4.1ms | 0.1% | 3 | `(anonymous)` | `makeAudioTimeDomainAnalysisTask.ts:97` |
| 7 | 4.1ms | 0.1% | 3 | `(anonymous)` | `makeAudioFrequencyAnalysisTask.ts:137` |
| 8 | 4.1ms | 0.1% | 3 | `(anonymous)` | `EFTemporal.ts:331` |
| 9 | 2.7ms | 0.1% | 2 | `(anonymous)` | `EFTimegroup.ts:1389` |
| 10 | 2.7ms | 0.1% | 2 | `captureFromClone` | `renderTimegroupToCanvas.ts:157` |
| 11 | 2.7ms | 0.1% | 2 | `captureFromClone` | `renderTimegroupToCanvas.ts:157` |
| 12 | 2.7ms | 0.1% | 2 | `compareTwoCanvases` | `visualRegressionUtils.ts:94` |
| 13 | 1.4ms | 0.0% | 1 | `(anonymous)` | `useMSW.ts:1` |
| 14 | 1.4ms | 0.0% | 1 | `(anonymous)` | `EFText.ts:1` |
| 15 | 1.4ms | 0.0% | 1 | `(anonymous)` | `EFTimeline.ts:1` |
| 16 | 1.4ms | 0.0% | 1 | `TargetableElement` | `TargetController.ts:52` |
| 17 | 1.4ms | 0.0% | 1 | `determineDurationSource` | `EFTemporal.ts:42` |
| 18 | 1.4ms | 0.0% | 1 | `get intrinsicDurationMs` | `EFMedia.ts:150` |
| 19 | 1.4ms | 0.0% | 1 | `(anonymous)` | `EFTimegroup.ts:1375` |
| 20 | 1.4ms | 0.0% | 1 | `__privateWrapper` | `EFTimegroup.ts:19` |

## Top 20 Functions by Total Time

Total time = time spent in the function including all functions it calls

| Rank | Total Time | Total % | Self Time | Function | Location |
|------|------------|---------|-----------|----------|----------|
| 1 | 291.4ms | 9.6% | 1.4ms | `captureBatch` | `EFTimegroup.ts:769` |
| 2 | 290.0ms | 9.5% | 2.7ms | `captureFromClone` | `renderTimegroupToCanvas.ts:157` |
| 3 | 287.3ms | 9.5% | 285.9ms | `renderToImageNative` | `renderToImageNative.ts:16` |
| 4 | 87.1ms | 2.9% | 1.4ms | `(anonymous)` | `renderTimegroupToCanvas.browsertest.ts:543` |
| 5 | 85.8ms | 2.8% | 0.0ms | `expectCanvasesToMatch` | `visualRegressionUtils.ts:121` |
| 6 | 85.8ms | 2.8% | 2.7ms | `compareTwoCanvases` | `visualRegressionUtils.ts:94` |
| 7 | 79.0ms | 2.6% | 79.0ms | `captureCanvasAsDataUrl` | `visualRegressionUtils.ts:1` |
| 8 | 17.7ms | 0.6% | 0.0ms | `(anonymous)` | `renderTimegroupToCanvas.browsertest.ts:529` |
| 9 | 17.7ms | 0.6% | 17.7ms | `hasCanvasContent` | `renderTimegroupToCanvas.browsertest.ts:345` |
| 10 | 16.3ms | 0.5% | 0.0ms | `(anonymous)` | `renderTimegroupToCanvas.browsertest.ts:517` |
| 11 | 16.3ms | 0.5% | 16.3ms | `hasCanvasContent` | `renderTimegroupToCanvas.browsertest.ts:345` |
| 12 | 10.9ms | 0.4% | 0.0ms | `(anonymous)` | `EFVideo.ts:80` |
| 13 | 10.9ms | 0.4% | 0.0ms | `paint` | `EFVideo.ts:174` |
| 14 | 10.9ms | 0.4% | 0.0ms | `withSpanSync` | `tracingHelpers.ts:129` |
| 15 | 10.9ms | 0.4% | 0.0ms | `(anonymous)` | `EFVideo.ts:184` |
| 16 | 8.2ms | 0.3% | 0.0ms | `videoTimegroup` | `renderTimegroupToCanvas.browsertest.ts:69` |
| 17 | 6.8ms | 0.2% | 0.0ms | `displayFrame` | `EFVideo.ts:249` |
| 18 | 6.8ms | 0.2% | 0.0ms | `withSpanSync` | `tracingHelpers.ts:129` |
| 19 | 6.8ms | 0.2% | 6.8ms | `(anonymous)` | `EFVideo.ts:261` |
| 20 | 5.4ms | 0.2% | 1.4ms | `task` | `makeAudioTimeDomainAnalysisTask.ts:30` |

## Most Frequently Sampled Functions

Functions that appeared most often in profiling samples (may indicate hot loops or frequently called code)

| Rank | Samples | Sample % | Avg Time/Sample | Function | Location |
|------|---------|----------|-----------------|----------|----------|
| 1 | 210 | 9.41% | 1.362ms | `renderToImageNative` | `renderToImageNative.ts:16` |
| 2 | 58 | 2.60% | 1.362ms | `captureCanvasAsDataUrl` | `visualRegressionUtils.ts:1` |
| 3 | 13 | 0.58% | 1.362ms | `hasCanvasContent` | `renderTimegroupToCanvas.browsertest.ts:345` |
| 4 | 12 | 0.54% | 1.362ms | `hasCanvasContent` | `renderTimegroupToCanvas.browsertest.ts:345` |
| 5 | 5 | 0.22% | 1.362ms | `(anonymous)` | `EFVideo.ts:261` |
| 6 | 3 | 0.13% | 1.362ms | `(anonymous)` | `makeAudioTimeDomainAnalysisTask.ts:97` |
| 7 | 3 | 0.13% | 1.362ms | `(anonymous)` | `makeAudioFrequencyAnalysisTask.ts:137` |
| 8 | 3 | 0.13% | 1.362ms | `(anonymous)` | `EFTemporal.ts:331` |
| 9 | 2 | 0.09% | 1.362ms | `(anonymous)` | `EFTimegroup.ts:1389` |
| 10 | 2 | 0.09% | 1.362ms | `captureFromClone` | `renderTimegroupToCanvas.ts:157` |
| 11 | 2 | 0.09% | 1.362ms | `captureFromClone` | `renderTimegroupToCanvas.ts:157` |
| 12 | 2 | 0.09% | 1.362ms | `compareTwoCanvases` | `visualRegressionUtils.ts:94` |
| 13 | 1 | 0.04% | 1.362ms | `(anonymous)` | `useMSW.ts:1` |
| 14 | 1 | 0.04% | 1.362ms | `(anonymous)` | `EFText.ts:1` |
| 15 | 1 | 0.04% | 1.362ms | `(anonymous)` | `EFTimeline.ts:1` |
| 16 | 1 | 0.04% | 1.362ms | `TargetableElement` | `TargetController.ts:52` |
| 17 | 1 | 0.04% | 1.362ms | `determineDurationSource` | `EFTemporal.ts:42` |
| 18 | 1 | 0.04% | 1.362ms | `get intrinsicDurationMs` | `EFMedia.ts:150` |
| 19 | 1 | 0.04% | 1.362ms | `(anonymous)` | `EFTimegroup.ts:1375` |
| 20 | 1 | 0.04% | 1.362ms | `__privateWrapper` | `EFTimegroup.ts:19` |

## Key Findings

### Top Hotspot

**Function:** `renderToImageNative`
**Location:** `renderToImageNative.ts:16`
**Self Time:** 285.9ms (9.4% of profile)
**Total Time:** 287.3ms (9.5% of profile)
**Samples:** 210

This function is the single biggest performance bottleneck in our code.

### Top 3 Functions

The top 3 functions account for **382.6ms (12.6%)** of total profile time:

1. `renderToImageNative` - 285.9ms @ `renderToImageNative.ts:16`
2. `captureCanvasAsDataUrl` - 79.0ms @ `visualRegressionUtils.ts:1`
3. `hasCanvasContent` - 17.7ms @ `renderTimegroupToCanvas.browsertest.ts:345`

## Optimization Recommendations

Based on the profiling data, focus optimization efforts on:

### 1. renderToImageNative

- **Impact:** 285.9ms (9.4% of profile)
- **Location:** `renderToImageNative.ts:16`
- **Recommendation:** Investigate and optimize this function

### 2. captureCanvasAsDataUrl

- **Impact:** 79.0ms (2.6% of profile)
- **Location:** `visualRegressionUtils.ts:1`
- **Recommendation:** Investigate and optimize this function

### 3. hasCanvasContent

- **Impact:** 17.7ms (0.6% of profile)
- **Location:** `renderTimegroupToCanvas.browsertest.ts:345`
- **Recommendation:** Investigate and optimize this function

### 4. hasCanvasContent

- **Impact:** 16.3ms (0.5% of profile)
- **Location:** `renderTimegroupToCanvas.browsertest.ts:345`
- **Recommendation:** Investigate and optimize this function

### 5. (anonymous)

- **Impact:** 6.8ms (0.2% of profile)
- **Location:** `EFVideo.ts:261`
- **Recommendation:** Investigate and optimize this function

## Source Map Validation

✅ **Source maps working correctly**

- Found 184 TypeScript functions in profile
- Line numbers are being mapped from compiled JavaScript back to TypeScript
- Can identify exact functions and locations for optimization

## Next Steps

1. **Review top hotspots** - Examine the top 5 functions for optimization opportunities
2. **Measure impact** - After optimizing, re-run profiler to measure improvements
3. **Focus on high-value targets** - Prioritize functions with both high self time and high total time
4. **Check call patterns** - Look for functions called too frequently (high sample counts)

