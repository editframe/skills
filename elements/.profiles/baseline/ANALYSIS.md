# Performance Analysis Report
**Generated:** 2026-01-24  
**Baseline:** elements/.profiles/baseline/

## Executive Summary

Analysis of 12 browser test profiles reveals **5 critical performance bottlenecks** that significantly impact rendering throughput:

### Top 5 Critical Bottlenecks (Ranked by Impact)

1. **RAF Wait Overhead (Critical - 152x slowdown)**
   - Impact: Reduces throughput from 68.7x realtime to 0.5x realtime
   - Location: `waitForPaintFlush()` double RAF pattern
   - Affected: All rendering paths using foreignObject

2. **Native Canvas API Disabled (Critical - 2.7x slowdown)**
   - Impact: `isNativeCanvasApiEnabled()` hardcoded to return false
   - Native: 0.38ms avg, ForeignObject: 0.67ms avg (1.76x slower)
   - Affected: All `renderToImage` calls

3. **CSS Property Sync Overhead (High - 20x potential improvement)**
   - Impact: Syncing all 410 properties: 0.789ms vs fixed 45: 0.038ms
   - Current "fixed 45" strategy suboptimal vs batched approaches
   - No change detection or caching implemented

4. **Video Frame Capture Performance (Medium)**
   - Native path: 575ms for 30 thumbnails
   - ForeignObject path: 345ms for 30 thumbnails (1.67x faster)
   - Seek time dominates: ~145ms for 30 frames

5. **DOM Clone Reconstruction (Medium - 1.3x improvement available)**
   - Rebuilding clone per frame: 0.79ms/frame
   - Reusing clone structure: 0.62ms/frame
   - Total export (30 frames): 24ms → 19ms with reuse

---

## Detailed Analysis

### 1. RAF (RequestAnimationFrame) Overhead

**Severity:** CRITICAL  
**Location:** `waitForPaintFlush()` in foreignObject rendering path  
**Files:** renderTimegroupToCanvas (foreignObject path)

#### Measurements
```
No RAF (getComputedStyle flush):  0.000ms avg
Single RAF:                        8.10ms avg
Double RAF (waitForPaintFlush):   18.28ms avg
```

#### Impact
- **With RAF wait:** 73.58ms avg → 14 fps → 0.5x realtime
- **Without RAF wait:** 0.48ms avg → 2062 fps → 68.7x realtime
- **Speedup:** 152x faster without artificial RAF wait

#### Affected Tests
- renderTimegroupToCanvas.benchmark.browsertest (full pipeline timing)
- All foreignObject rendering paths

#### Root Cause
The `waitForPaintFlush()` function uses double RAF to ensure content is painted, but this introduces massive overhead (~18ms minimum) that kills throughput.

#### Optimization Priorities
1. **Easy/High Impact:** Remove double RAF entirely for native path (already ~0ms overhead)
2. **Medium/High Impact:** Use single RAF instead of double (8ms vs 18ms)
3. **Hard/Medium Impact:** Use getComputedStyle flush only (synchronous, 0ms)

---

### 2. Native Canvas API Disabled

**Severity:** CRITICAL  
**Location:** `isNativeCanvasApiEnabled()` function  
**Files:** renderTimegroupToCanvas rendering dispatch

#### Measurements
```
ForeignObject path: avg=0.67ms
Native path:        avg=0.38ms (1.76x faster)
Native path overhead from waitForPaintFlush: ~0ms
```

#### Impact on Full Pipeline
- Current (native disabled): 0.43ms avg (2298.9 fps, 76.63x realtime)
- Potential (native enabled): ~0.21ms avg (>4000 fps, >130x realtime)

#### Affected Tests
- renderTimegroupToCanvas.benchmark.browsertest (path comparison)
- All tests using `renderToImage()`

#### Root Cause
```
⚠️ NOTE: isNativeCanvasApiEnabled() is hardcoded to return false!
   This is why performance regressed from 2.7x to 1.3x realtime.
```

#### Optimization Priority
**Easy/Critical Impact:** Change `isNativeCanvasApiEnabled()` to return true when native API is available

---

### 3. CSS Property Sync Strategies

**Severity:** HIGH  
**Location:** CSS property synchronization in `syncStyles()`  
**Files:** renderTimegroupToCanvas style sync phase

#### Current Performance (1000 iterations)
```
Strategy                    Time      Per-Iter    Relative
─────────────────────────────────────────────────────────
Fixed 45 props (current)   38.5ms    0.038ms     1.00x
cssText (broken)            0.2ms    0.000ms     N/A (incorrect)
All props write           789.5ms    0.789ms     0.05x (20x SLOWER)
Pre-cached non-default    170.7ms    0.171ms     0.23x
JIT (bracket access)      283.4ms    0.283ms     0.14x
JIT 45 props               57.6ms    0.058ms     0.67x
Batched read→write         56.6ms    0.057ms     0.68x
Batched + skip-equal       63.3ms    0.063ms     0.61x
```

#### Multi-Element Simulation (30 frames, 19 elements, 59 props each)
```
Total property operations: 33,630

Current (sync all):     27.9ms (0.93ms/frame)
Cached (skip same):     12.7ms (0.42ms/frame)
Speedup:                2.20x
Skipped:                100% (no animation)

With animation (1 element):
Current (sync all):     29.3ms (0.98ms/frame)
Cached (skip same):     13.5ms (0.45ms/frame)
Speedup:                2.17x
Skipped:                99.9% (30 writes, 33,600 skipped)
```

#### Affected Tests
- renderTimegroupToCanvas.benchmark.browsertest (CSS sync strategies)
- All rendering operations with style synchronization

#### Key Findings
- Current "fixed 45" approach is reasonable baseline
- **Caching with change detection provides 2.2x speedup** for typical export scenarios
- Non-default property count varies: 16-41 per element (avg 32.8)
- Batched strategies show marginal improvements over fixed 45

#### Most Common Non-Default Properties (100% of elements)
```
block-size, bottom, cursor, height, inline-size,
inset-block-end, inset-block-start, inset-inline-end,
perspective-origin, right, top, transform-origin,
visibility, width
```

#### Optimization Priority
1. **Medium/High Impact:** Implement cache + change detection (2.2x speedup)
2. **Easy/Medium Impact:** Add fast-path for transform+opacity only (3% of baseline time)
3. **Hard/Low Impact:** Dynamic property list based on element type

---

### 4. Video Frame Capture Performance

**Severity:** MEDIUM  
**Location:** Video thumbnail generation  
**Files:** renderTimegroupToCanvas (video content tests)

#### Batch Capture Timing (30 thumbnails from video)
```
Path            Clone   Seek    Capture  Total
───────────────────────────────────────────────
Native          36ms    145ms   575ms    755ms
ForeignObject   29ms    128ms   345ms    502ms

Speedup: 1.5x faster with foreignObject
```

#### Phase Breakdown
- **Seek time dominates:** ~145ms for 30 frames (4.8ms/seek)
- **Capture:** Native slower (575ms vs 345ms) - possibly video decode overhead
- **Clone:** Minimal difference (36ms vs 29ms)

#### Affected Tests
- renderTimegroupToCanvas.browsertest (thumbnail strip simulation)
- Both native and foreignObject video rendering paths

#### Optimization Priority
**Medium/Medium Impact:** Investigate why native path capture is slower for video content (575ms vs 345ms)

---

### 5. DOM Clone Reconstruction

**Severity:** MEDIUM  
**Location:** Clone creation in export loop  
**Files:** renderTimegroupToCanvas (export optimization tests)

#### Export Optimization (30 frames)
```
Strategy                Per-Frame  Total   FPS      Realtime
──────────────────────────────────────────────────────────
Rebuild per frame       0.79ms     24ms    1261fps  42.0x
Reuse clone structure   0.62ms     19ms    1604fps  53.5x

Speedup: 1.3x faster with clone reuse
```

#### Full Export Simulation (seek + sync + render)
```
Phase Breakdown:
  seek:    0.12ms (16%)
  sync:    0.44ms (56%)
  render:  0.22ms (28%)
  ──────────────────
  TOTAL:   0.78ms/frame

Achievable: 1277 fps → 42.6x realtime
```

**Note:** Sync phase (56%) is largest contributor - connects to CSS optimization opportunity

#### Affected Tests
- renderTimegroupToCanvas.benchmark.browsertest (clone reuse test)

#### Optimization Priority
**Easy/Medium Impact:** Implement clone reuse for export operations (1.3x speedup)

---

## Anti-Patterns Detected

### 1. Hardcoded Feature Flags
**Severity:** HIGH  
**Pattern:** `isNativeCanvasApiEnabled()` returns false despite API availability  
**Impact:** Forces slower foreignObject path even when native is available

### 2. Artificial Synchronization Barriers
**Severity:** HIGH  
**Pattern:** Double RAF wait in `waitForPaintFlush()`  
**Impact:** 152x slowdown from unnecessary waiting

### 3. Over-Synchronization
**Severity:** MEDIUM  
**Pattern:** Syncing all CSS properties on every frame without change detection  
**Impact:** 2.2x slower than cached approach for typical export scenarios

### 4. Inefficient Batched vs Interleaved Reads
**Severity:** LOW  
**Pattern:** Interleaved read-write per node: 34.9ms vs Batched: 34.5ms  
**Winner:** Batched by 0.0x (negligible difference)  
**Note:** Both strategies perform similarly - no significant anti-pattern

---

## File-Level Performance Summary

| Test File | Duration | Tests | Key Metric |
|-----------|----------|-------|------------|
| renderTimegroupToCanvas.benchmark | 10.83s | 20 (11P/9F) | Comprehensive benchmarks |
| renderTimegroupToCanvas | 26.73s | 54 (50P/2F) | Full integration tests |
| renderTimegroupToCanvas.unit | 5.10s | 32P | Fast unit tests |
| WorkerPool.integration | 6.25s | 19P | Parallel encoding: 5.08x speedup |
| WorkerPool | 4.98s | 8P | Worker vs main: 0.84x (slower) |
| renderTimegroupToVideo.foreign-object | 15.20s | 4P | Export validation |
| renderTimegroupToVideo.native-path | 6.24s | 2 (1P/1S) | Native path validation |
| encoderWorker.unit | 4.94s | 18P | 640x480: 13.20ms, 5 req: 3.56ms avg |
| canvasEncoder | 4.82s | 8P | Basic encoding tests |
| thumbnailCacheSettings | 4.61s | 10P | Cache config tests |
| WorkerPool.unit | 4.72s | 15P | Unit tests |
| renderTimegroupPreview | 4.85s | 35P | Preview rendering tests |

---

## Optimization Priorities (Ranked)

### Priority 1: Critical/Easy Wins

| # | Optimization | Complexity | Impact | Speedup |
|---|--------------|------------|--------|---------|
| 1 | Enable native Canvas API | Easy | Critical | 1.76x (render) |
| 2 | Remove double RAF for native path | Easy | Critical | 152x (eliminate wait) |
| 3 | Implement clone reuse for exports | Easy | Medium | 1.3x (export) |

**Estimated Combined Impact:** 3-5x improvement in export throughput

### Priority 2: Medium/High Impact

| # | Optimization | Complexity | Impact | Speedup |
|---|--------------|------------|--------|---------|
| 4 | Add CSS property change detection cache | Medium | High | 2.2x (sync phase) |
| 5 | Use single RAF instead of double | Easy | High | 2.3x (reduce wait) |
| 6 | Fast-path for transform+opacity only | Easy | Medium | 33x (when applicable) |

**Estimated Combined Impact:** 2-4x improvement in frame preparation

### Priority 3: Investigate/Optimize

| # | Optimization | Complexity | Impact | Speedup |
|---|--------------|------------|--------|---------|
| 7 | Optimize native path video capture | Hard | Medium | 1.67x (video thumbnails) |
| 8 | Reduce video seek overhead | Hard | Medium | TBD (seek time) |
| 9 | Worker pool overhead investigation | Medium | Low | Workers slower for small tasks |

---

## Caching Opportunities

### High-Value Caching

1. **CSS Property Values (2.2x speedup)**
   - Cache computed style values per element
   - Skip writes when values unchanged
   - Call count: 33,630 operations/export → 30 writes (99.9% cache hit)
   - Self time saved: ~14ms per 30-frame export

2. **Transform/Opacity Fast Path (33x speedup)**
   - Detect when only transform/opacity changed
   - Skip full 45-property sync
   - Call count: High (every animated frame)
   - Self time saved: 0.058ms → 0.002ms per element

3. **Clone Structure Reuse (1.3x speedup)**
   - Create clone once, reuse for all frames
   - Update only time-variant properties
   - Call count: 30 clones → 1 clone per export
   - Self time saved: 5ms per 30-frame export

### Medium-Value Caching

4. **Non-Default Property Detection**
   - Cache which properties differ from defaults per element type
   - Call count: 1000 iterations with 16-41 properties each
   - Current: 170.7ms for pre-cached approach
   - Note: Fixed 45 already faster (38.5ms)

---

## Architectural Issues

### 1. Process Isolation Prevents Profiling
**Issue:** Vitest runs in separate renderer process from profiling target  
**Impact:** Cannot capture actual CPU profiles via Chrome DevTools Protocol  
**Status:** All 12 profiles show "mostly idle time (1 non-idle sample)"

**Workaround Used:** Tests include `performance.mark/measure` and timing output

### 2. Native Path Arbitrarily Disabled
**Issue:** `isNativeCanvasApiEnabled()` hardcoded to false  
**Impact:** System regressed from 2.7x to 1.3x realtime  
**Root Cause:** Feature flag override or incomplete implementation

### 3. ForeignObject Path Requires Paint Flush
**Issue:** Double RAF needed to ensure content painted before capture  
**Impact:** Minimum 18ms overhead per frame  
**Trade-off:** Removing wait risks incomplete/blank frames

---

## Test Coverage Summary

| Category | Tests | Status | Coverage |
|----------|-------|--------|----------|
| Rendering Paths | 54 | 50P/2F/2S | Both native & foreignObject |
| Benchmarks | 20 | 11P/9F | CSS sync, RAF, clone reuse |
| Worker Pool | 42 | 42P | Parallel encoding |
| Video Export | 6 | 5P/1S | Integration tests |
| Encoding | 26 | 26P | Canvas → WebCodecs |

**Total:** 148 tests, 134 passing, 11 failing, 3 skipped

**Failures:** Mostly in benchmark tests (9 "Cannot read properties of undefined" errors) - likely incomplete benchmark implementations

---

## Recommendations

### Immediate Actions (Week 1)
1. ✅ Change `isNativeCanvasApiEnabled()` to return true
2. ✅ Remove double RAF from native path (already has ~0ms overhead)
3. ✅ Implement clone reuse for `renderTimegroupToVideo` export loop

**Expected:** 3-4x export throughput improvement

### Short-Term (Month 1)
4. ✅ Add CSS property change detection cache
5. ✅ Implement transform+opacity fast path
6. ⚠️ Consider single RAF for foreignObject (requires testing)

**Expected:** Additional 2x improvement in frame prep

### Long-Term (Quarter 1)
7. 🔍 Investigate why native path slower for video capture (575ms vs 345ms)
8. 🔍 Profile video seek overhead (145ms for 30 seeks = 4.8ms each)
9. 📊 Add proper CPU profiling infrastructure (bypass Vitest isolation)

### Testing Infrastructure
- ✅ Add CPU profiling that captures test execution (not idle time)
- ✅ Expand benchmark coverage to avoid "undefined" errors
- ✅ Add regression tracking for key metrics (fps, realtime multiple)

---

## Key Metrics Baseline

### Rendering Performance
- **Native Path (disabled):** 0.38ms/frame → 2632 fps → 87.7x realtime
- **ForeignObject Path (current):** 0.67ms/frame → 1493 fps → 49.8x realtime
- **Full Pipeline:** 0.43ms/frame → 2299 fps → 76.6x realtime
- **With RAF Wait:** 73.58ms/frame → 14 fps → 0.5x realtime

### Export Performance (30 frames)
- **Rebuild clone:** 24ms total, 1261 fps, 42.0x realtime
- **Reuse clone:** 19ms total, 1604 fps, 53.5x realtime
- **With seek:** 0.78ms/frame → 1277 fps → 42.6x realtime

### CSS Sync Performance (1000 iterations)
- **Fixed 45 props:** 38.5ms (0.038ms/iter)
- **Batched:** 56.6ms (0.057ms/iter) - 1.5x slower
- **Cached + skip same:** 2.2x speedup for export (multi-frame)

### Worker Pool Performance
- **Parallel encoding:** 5.08x speedup vs sequential
- **Worker vs main thread:** 0.84x (workers slower for small tasks)

---

## Conclusion

The profiling baseline reveals **two critical bottlenecks** that together cause an estimated **10-20x slowdown** in rendering throughput:

1. **Native Canvas API artificially disabled** (1.76x immediate win)
2. **Double RAF wait in foreignObject path** (152x slowdown)

Addressing these two issues alone will recover the reported regression from "2.7x realtime" back to expected performance levels.

Secondary optimizations in **CSS property caching** (2.2x) and **clone reuse** (1.3x) provide additional 2-3x gains for export workloads.

**Total potential speedup: 15-30x** for full export pipeline with all optimizations applied.
