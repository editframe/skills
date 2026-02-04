# Performance Analysis Report

**Date**: 2026-02-04  
**Test Suite**: Smoke Tests (Server Rendering Mode)  
**Video Duration**: 100-200ms (3-6 frames at 30fps)

## Executive Summary

Single-test speed for rendering 100ms videos (3 frames) averages **~2.3 seconds**, with **75-77% of time spent on HTML bundling** (Vite/Rolldown). Frame rendering itself is relatively fast at **120-150ms per frame**.

## Detailed Timing Breakdown

### Setup Phase (beforeAll)
- **testAgent creation**: 109ms
- **Asset processing**: 199ms
- **ElectronRPC creation**: 4,871ms ⚠️ **VERY SLOW**
- **Total beforeAll**: 5,178ms

### Per-Test Breakdown (Average across 4 tests)

| Operation | Time (ms) | % of Total | Notes |
|-----------|-----------|------------|-------|
| **Bundle HTML** | ~1,828ms | **76%** | Vite/Rolldown compilation |
| **Get Render Info** | ~149ms | 6% | RPC call + page initialization |
| **Create Assets Bundle** | ~1.2ms | 0.05% | Asset metadata preparation |
| **Render Fragment** | ~488ms | 19% | Frame generation + encoding |
| **Write File** | ~2ms | 0.08% | MP4 file I/O |
| **TOTAL** | ~2,468ms | 100% | |

### Frame Generation Details (from Electron logs)

**Per-Frame Timing** (100ms video, 3 frames):
- **Average**: 130ms per frame
- **p50**: 54ms per frame
- **Longest**: 76ms per frame
- **Total frame generation**: 220-264ms

**Encoding Breakdown** (from SegmentEncoder):
- **Initialize**: 15-18ms
- **Frame Generation**: 212-264ms (3 frames)
- **Concat** (audio): 0.8-1.9ms
- **Muxer**: 13-24ms
- **Total**: ~250-305ms

## Critical Bottlenecks

### 1. HTML Bundling (76% of time) 🔴 **CRITICAL**

**Current State**: Every test bundles HTML from scratch using Vite/Rolldown (~1.8 seconds)

**Why It's Slow**:
- Full Vite compilation pipeline runs for each test
- Tailwind CSS processing
- TypeScript/JSX transformation
- PostCSS plugins
- No bundle caching between tests with identical HTML

**Potential Improvements**:
- **Bundle caching**: Hash HTML templates, reuse bundles (~75% time savings)
- **Pre-compiled fixtures**: Use pre-bundled HTML for common test cases
- **Simpler bundler**: Use esbuild directly (faster than Vite for simple cases)
- **Skip bundling for simple HTML**: Parse HTML, detect if bundling is needed

**Estimated Impact**: Could reduce per-test time from 2.3s to **~600ms** (60% reduction)

### 2. ElectronRPC Creation (4.9 seconds) 🔴 **CRITICAL**

**Current State**: Creating a new Electron process takes ~5 seconds

**Why It's Slow**:
- Spawning Electron process
- Loading Node modules (OpenTelemetry, Pino, etc.)
- Initializing rendering engine
- Establishing RPC connection

**Current Mitigation**: Already sharing electronRpc across tests in smoke suite

**Future Improvements**:
- **Process pooling**: Keep warm Electron processes ready
- **Lazy loading**: Defer heavy module loads until needed
- **Lighter initialization**: Skip non-essential instrumentation in test mode

**Estimated Impact**: Only matters for first test (already mitigated in smoke tests)

### 3. Frame Rendering (120-150ms per frame) 🟡 **MODERATE**

**Current State**: Each frame takes 120-150ms to render and capture

**Breakdown**:
- **Page rendering**: Lit element updates, CSS layout, painting
- **Frame capture**: Electron bitmap capture
- **Encoding**: H.264 encoding per frame

**Analysis**:
- For 100ms video (3 frames), frame generation is **only 19% of total time**
- Per-frame time (130ms) is reasonable for complex DOM rendering
- Already faster than real-time (130ms to render 33ms of video)

**Potential Improvements** (diminishing returns):
- **GPU acceleration**: Ensure GPU compositing is enabled
- **Simplified test fixtures**: Remove unnecessary DOM complexity
- **Skip CSS recalculations**: Use static layouts when possible

**Estimated Impact**: Could reduce per-frame time to ~80-100ms (20% improvement, but only 4% overall)

## Performance by Video Length

| Video Duration | Frame Count | Bundle HTML | Frame Gen | Total Time | Time per Frame |
|----------------|-------------|-------------|-----------|------------|----------------|
| 100ms | 3 frames | 1,753-1,975ms | 380-455ms | 2,278-2,608ms | 127-152ms |
| 200ms | 6 frames | 1,851ms | 718ms | 2,709ms | 120ms |

**Observation**: Bundle HTML time dominates regardless of video length. Frame generation scales linearly with video duration.

## Comparison: With vs Without Shared ElectronRPC

**Without shared RPC** (creating new RPC per test):
- First test: ~7.1s (5s RPC creation + 2.1s render)
- Subsequent tests: ~2.3s each (if RPC is reused)

**With shared RPC** (current smoke test setup):
- Setup (beforeAll): ~5.2s (one-time cost)
- Each test: ~2.3s
- **Total for 8 tests**: ~23s (5.2s + 8×2.3s)

**Without shared RPC**:
- **Total for 8 tests**: ~63s (8×7.9s if creating new RPC each time)

**Savings**: ~63% faster with shared RPC

## Recommendations (Prioritized)

### 1. Implement Bundle Caching (HIGH IMPACT) 🎯

**Implementation**:
```typescript
// Cache bundles by content hash
const bundleCache = new Map<string, BundleInfo>();

function getCachedOrBundleTemplate(html: string): BundleInfo {
  const hash = createHash('sha256').update(html).digest('hex');
  if (bundleCache.has(hash)) {
    return bundleCache.get(hash);
  }
  const bundle = bundleTestTemplate(html, ...);
  bundleCache.set(hash, bundle);
  return bundle;
}
```

**Expected**: Reduce test time from 2.3s to **~600ms** (60% reduction)  
**Effort**: Low (2-4 hours)  
**Risk**: Low

### 2. Pre-compile Common Fixtures (MEDIUM IMPACT) 🎯

**Implementation**:
- Pre-bundle common test templates at test startup
- Store in shared cache
- Tests reference pre-bundled HTML

**Expected**: Eliminate bundling time for standard tests (**~1.8s savings**)  
**Effort**: Medium (1 day)  
**Risk**: Low

### 3. Optimize Frame Rendering (LOW IMPACT) ⚠️

**Rationale**: Frame rendering is only 19% of total time. Optimizing it has diminishing returns.

**Possible Optimizations**:
- Ensure GPU compositing is enabled
- Profile specific rendering bottlenecks
- Simplify test fixtures

**Expected**: 20-30% improvement in frame time = **~100ms total savings** (4% overall)  
**Effort**: High (requires profiling, may need Electron changes)  
**Risk**: Medium (could destabilize rendering)

### 4. Parallel Test Execution (MEDIUM IMPACT)

**Note**: User stated "we're really more worried about pure single-test speed than parallelism"

**However**, Vitest already supports parallel execution. With bundle caching:
- 8 tests × 600ms = 4.8s sequential
- 8 tests / 4 workers × 600ms = 1.2s parallel

**Expected**: 4x speedup with 4 workers  
**Effort**: None (already supported by Vitest)  
**Risk**: Low (need to ensure tests are independent)

## Target Performance Goals

| Metric | Current | With Bundle Caching | Stretch Goal |
|--------|---------|---------------------|--------------|
| Single test (100ms video) | 2.3s | 600ms | 400ms |
| 8 smoke tests (sequential) | ~23s | ~10s | ~5s |
| Per-frame rendering | 130ms | 130ms | 80ms |
| Time per ms of video | 23ms | 6ms | 4ms |

## Frame-Level Performance Deep Dive

From Electron SegmentEncoder logs, the rendering pipeline for 3 frames (100ms video):

1. **Initialize**: 15-18ms (one-time per video)
   - Set up encoder
   - Initialize canvas/rendering context
   - Prepare audio pipeline

2. **Frame Generation**: 212-264ms (total for 3 frames)
   - Per frame: 54-76ms
   - Variation: ±10ms per frame
   - Includes: DOM updates, CSS layout, painting, capture

3. **Audio Concat**: 0.8-1.9ms
   - FFmpeg audio concatenation (very fast)

4. **Muxer**: 13-24ms
   - MP4 box structure creation
   - Interleaving video/audio tracks

**Breakdown by percentage**:
- Frame generation: 70-85% of rendering time
- Muxer: 10-15%
- Initialize: 5-10%
- Audio concat: <1%

## Conclusions

1. **Bundle caching is the single most impactful optimization** - 76% of time is spent re-bundling identical HTML
2. **Frame rendering is already reasonably fast** - 130ms per frame is acceptable for complex DOM rendering
3. **ElectronRPC creation is expensive but already mitigated** - Sharing across tests eliminates this bottleneck
4. **Low-hanging fruit**: Implement bundle caching first, profile everything else later

## Next Steps

1. ✅ **Add timing instrumentation** (completed)
2. ✅ **Collect performance data** (completed)
3. ✅ **Implement bundle caching** (completed)
4. ✅ **Measure cache effectiveness** (completed)
5. 🔍 **Profile frame rendering if needed** (only if still too slow)

## Bundle Caching Implementation Results

**Implementation**: Content-based hash caching with disk-existence validation

**Cache Hit Performance** (rendering identical HTML):
- Test without cache: ~2,300ms (1,800ms bundling)
- Test with cache hit: **~530ms** (0ms bundling)
- **Speedup: 78-79% faster** (~4.3x faster)
- Bundle time: 1,800ms → 0.16ms (**10,000x faster**)

**Cache Effectiveness**:
- Hit rate in test scenario: 60% (3 hits / 5 tests)
- Cache validation: Checks file existence before returning cached result
- Memory overhead: Minimal (Map of bundle paths + hashes)

**When Cache Helps**:
- ✅ Rendering same composition multiple times
- ✅ Iterating on test development (running tests repeatedly)
- ✅ Test suites with common template patterns
- ❌ Smoke tests with unique HTML per test (no duplicate HTML)

**Impact Assessment**:
- Single test with reused HTML: **78% faster** (2.3s → 0.5s)
- Test suite with unique HTML: No improvement (each test has different HTML)
- Development workflow: Significant improvement when re-running tests during development

## Hash Optimization (Feb 4, 2026)

### Problem Identified
Initial cache implementation had **double-hashing** overhead:
- Hash computed in `getCachedOrBundleTemplate` (for cache key)
- Hash computed again in `bundleTestTemplate` (for directory naming)
- Unnecessary file I/O check (`access()`) on every cache lookup

### Solution
1. Compute hash **once** in cache layer
2. Pass pre-computed hash to `bundleTestTemplate` via optional parameter
3. Removed file existence check (trust the Map cache)

### Impact
- Hash computation: ~0.02-0.04ms (negligible)
- Eliminated redundant SHA-256 computation
- Removed I/O overhead on cache checks
- Cache performance unchanged: **0.5-0.6s (hit) vs 2.4-2.6s (miss)**

## Asset Processing Optimization (Feb 4, 2026)

### Problem Identified  
Assets were checked by `filename` + `org_id` only:
- Same file content with different names would be reprocessed
- No content-based deduplication
- MD5 column populated with UUID instead of actual checksum

### Solution
Implemented **MD5-based asset caching**:
1. Compute MD5 checksum of file content
2. Check database by MD5 first (content-based deduplication)
3. Fallback to filename-based check
4. Store actual MD5 in database (not UUID)

### Files Modified
- `processTestAssets.ts`: Added `computeMD5()` function
- `processTestVideoAsset()`: MD5 check before filename check
- `processTestImageAsset()`: Same MD5-first strategy

### Impact
- Deduplicates assets with different filenames but same content
- Provides proper asset tracking with real checksums
- Asset processing already fast (~200ms for 2 assets in beforeAll)
- Main benefit: Correctness and preventing duplicate processing
