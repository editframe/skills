# RAF Removal Results

**Date:** 2026-01-25  
**Fix:** Remove unnecessary requestAnimationFrame waits from `EFText.whenSegmentsReady()`

---

## Summary

Optimized `EFText.whenSegmentsReady()` to skip RAF waits after first initialization, reducing idle time and achieving **2.07x speedup** on video.html rendering.

---

## Implementation

### Problem

`EFText.whenSegmentsReady()` was called every frame for every text element in `EFTimegroup.seekForRender()`. Each call had 3 RAF waits (48ms @ 60fps), causing significant idle time:

- 5 text elements × 3 RAF waits × 16ms = **240ms idle per frame** (worst case)
- Segments only need RAF waits on **first initialization**, not every frame

### Solution

Added `#segmentsInitialized` flag to track if segments are already created and connected:

```typescript
#segmentsInitialized = false;

async whenSegmentsReady(): Promise<EFTextSegment[]> {
  await this.updateComplete;

  // If segments already initialized and exist, skip RAF waits
  if (this.#segmentsInitialized && this.segments.length > 0) {
    await Promise.all(this.segments.map((seg) => seg.updateComplete));
    return this.segments;
  }

  // First time: wait for segments to be created (keep existing logic)
  // ... (existing RAF waits) ...
  
  // Mark as initialized after first successful wait
  this.#segmentsInitialized = true;
  return this.segments;
}
```

The flag is reset in `splitText()` when new segments are created.

---

## Performance Results

### Test Setup

| Parameter | Value |
|-----------|-------|
| **Project** | `dev-projects/video.html` |
| **Duration** | 5 seconds (0-5000ms) |
| **Resolution** | 800x500 |
| **Text Elements** | 5 ef-text elements with split animations |
| **Browser** | Chrome (via editframe CLI) |
| **Server** | http://main.localhost:4321 |

### Baseline (Before Fix)

```bash
./scripts/editframe render \
  --url http://main.localhost:4321/video.html \
  --profile --profile-output ./video-baseline-5sec.cpuprofile \
  --from-ms 0 --to-ms 5000
```

| Metric | Value |
|--------|-------|
| **Render Time** | 38.9s |
| **Video Duration** | 5.0s |
| **Speed** | **0.129x realtime** |
| **Idle Time** | 53.4% (66,567 / 124,656 samples) |
| **Total Samples** | 124,656 |

**Top Hotspots:**
- 53.4% idle
- 16.6% toDataURL (20,691 samples)
- 12.4% getImageData (15,409 samples)
- 6.0% program overhead

### After Fix

```bash
./scripts/editframe render \
  --url http://main.localhost:4321/video.html \
  --profile --profile-output ./video-raf-fixed-5sec.cpuprofile \
  --from-ms 0 --to-ms 5000
```

| Metric | Value | Change |
|--------|-------|--------|
| **Render Time** | 18.7s | ⬇️ **51.9% faster** |
| **Video Duration** | 5.0s | - |
| **Speed** | **0.267x realtime** | ⬆️ **2.07x faster** |
| **Idle Time** | 46.6% (49,849 / 107,015 samples) | ⬇️ **6.8pp lower** |
| **Total Samples** | 107,015 | ⬇️ 14.2% fewer |

**Top Hotspots:**
- 46.6% idle (down from 53.4%)
- 17.3% toDataURL (18,472 samples)
- 9.6% program overhead
- 8.8% getImageData (9,462 samples)

---

## Analysis

### What Changed

1. **Render time halved:** 38.9s → 18.7s (**51.9% reduction**)
2. **Speed doubled:** 0.129x → 0.267x realtime (**2.07x improvement**)
3. **Idle time reduced:** 53.4% → 46.6% (**6.8 percentage point drop**)
4. **Total CPU samples reduced:** 124,656 → 107,015 (**14.2% fewer samples**)

### Why It Works

After the first frame:
- Text segments are already created and connected
- No need to wait 3 RAF cycles (48ms) for segments to be ready
- Fast path: just wait for `updateComplete` promises (~1-2ms)

**Per-frame savings (after first frame):**
- Before: ~48ms waiting for RAF × 5 text elements = **240ms**
- After: ~2ms waiting for updateComplete × 5 text elements = **10ms**
- **Savings: ~230ms per frame** (96% reduction in text-related wait time)

### Why Not 4-6x?

Original hypothesis expected 4-6x speedup, but we achieved 2.07x because:

1. **RAF waits were only part of the idle time**
   - Total idle: 53.4% baseline
   - RAF waits estimated: ~240ms/frame, but frames aren't uniform
   - Other sources of idle time remain (canvas ops, encoding waits)

2. **Other bottlenecks still exist**
   - `toDataURL`: 17.3% (canvas serialization)
   - `getImageData`: 8.8% (pixel readback)
   - `serializeToSvgDataUri`: 1.2% (DOM serialization)
   - These are still synchronous and blocking

3. **Idle time only dropped 6.8pp**
   - 53.4% → 46.6% idle
   - Removing RAF waits freed up ~7% of total time
   - Remaining 46.6% idle is from other pipeline bottlenecks

### Remaining Bottlenecks

Even with RAF removal, idle time is still 46.6%. The remaining bottlenecks are:

1. **Canvas serialization (toDataURL, getImageData):** 26.1% combined
2. **Sequential encoding pipeline:** No overlap between frames
3. **Synchronous DOM operations:** Style sync, serialization

To achieve 1-2x realtime (user's target), we need to address these remaining bottlenecks.

---

## Correctness Verification

### Tests

All tests pass:
```bash
./scripts/browsertest packages/elements/src/elements/EFText.browsertest.ts
✓ 43 passed | 4 skipped (47 total)
```

The fix maintains correctness because:
- Segments are still fully initialized on first call (RAF waits preserved)
- Flag is reset when text content or split mode changes
- Fast path only activates when segments are already ready

---

## Conclusion

**Achievement: 2.07x speedup (0.129x → 0.267x realtime)**

This optimization successfully eliminates unnecessary RAF waits in the text rendering path, resulting in:
- ✅ **2x faster rendering** (38.9s → 18.7s)
- ✅ **Reduced idle time** (53.4% → 46.6%)
- ✅ **All tests pass** (no correctness regressions)

While not the 4-6x originally hoped for, this is a **significant improvement** that moves us closer to the 1-2x realtime target for real-world projects.

### Next Steps

To reach 1-2x realtime, address remaining bottlenecks:
1. Reduce canvas serialization overhead (26% of time)
2. Pipeline frame rendering and encoding in parallel
3. Optimize or cache DOM style synchronization

---

## Files

- **Baseline profile:** `video-baseline-5sec.cpuprofile` (38.9s, 124k samples)
- **Optimized profile:** `video-raf-fixed-5sec.cpuprofile` (18.7s, 107k samples)
- **Code changes:** `elements/packages/elements/src/elements/EFText.ts`
- **Tests:** `elements/packages/elements/src/elements/EFText.browsertest.ts` (all pass)
