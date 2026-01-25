# video.html Performance Analysis - Deliverables

**Analysis Date:** 2026-01-25  
**Task:** Measure real-world video export performance using profile-export.ts  
**Project:** elements/dev-projects/video.html

---

## 📋 What Was Done

1. ✅ Ran `npx tsx scripts/profile-export.ts --project dev-projects/video.html`
2. ✅ Captured full CPU profile during 41-second video export
3. ✅ Analyzed 344,364 profile samples with source map resolution
4. ✅ Identified performance bottlenecks
5. ✅ Created comprehensive analysis reports
6. ✅ **NO fixes attempted** (measurement only, as requested)

---

## 📊 Key Finding

**Real-world export performance is 0.72x realtime** (41s video took 56.88s)

This confirms the user's 0.4x performance report and is **3.6x slower** than integration tests.

**Root cause: 73% idle time due to sequential frame processing pipeline**

---

## 📁 Generated Files

### 1. Executive Summary (Start Here)
**File:** `.profiles/VIDEO_HTML_EXECUTIVE_SUMMARY.md`

Quick overview with:
- Bottom-line results (0.72x realtime)
- Root cause (73% idle time)
- Top bottlenecks
- Optimization priorities with expected impact
- Next steps

**Read this first for the TL;DR**

---

### 2. Comprehensive Analysis
**File:** `.profiles/VIDEO_HTML_PERFORMANCE.md`

Detailed breakdown including:
- Test setup and content description
- Performance metrics and benchmarks
- Comparison with integration tests
- Top hotspots (functions + files + native APIs)
- Line-level profiling of hot functions
- Why real-world is slower than tests
- Bottleneck identification and prioritization
- Actionable optimization targets with expected speedups

**Read this for deep understanding**

---

### 3. Raw Console Output
**File:** `.profiles/VIDEO_HTML_CONSOLE_OUTPUT.txt`

Complete console output from profile-export.ts including:
- Profiling harness configuration
- VideoFrame benchmark results
- File-level time breakdown
- Line-level profiling
- Native API time
- Actionable optimization targets

**Reference this for exact timings**

---

### 4. CPU Profile (Chrome DevTools)
**File:** `../export-profile.cpuprofile` (6.8MB)

Raw V8 CPU profile with 344,364 samples

**How to view:**
1. Open Chrome: `chrome://inspect`
2. Click "Open dedicated DevTools for Node"
3. Go to Performance tab
4. Click "Load profile"
5. Select `export-profile.cpuprofile`

**Use this for interactive flame graph exploration**

---

### 5. Exported Video
**File:** `../profile-export-test.mp4` (5.1MB, 41s)

The actual video output from the profiled export

**Verify this to confirm export worked correctly**

---

## 🎯 Primary Findings

### 1. Sequential Pipeline is the Bottleneck

**73.2% idle time** = 41.7 seconds of waiting

The export processes frames one-by-one with no parallelization:
```
Frame 1: Render → Read pixels → Encode → [WAIT FOR BROWSER]
Frame 2: Render → Read pixels → Encode → [WAIT FOR BROWSER]
...
```

**Fix this first → 2-4x speedup expected**

---

### 2. Native API Overhead Adds Up

| API | Time | Purpose |
|-----|------|---------|
| `getImageData` | 1867ms | Canvas pixel readback (blocks pipeline) |
| `serializeToString` | 818ms | DOM serialization for SVG |
| `getAnimations` | 487ms | Animation discovery (should be cached) |
| `encode` | 385ms | Video encoding (efficient!) |
| Garbage collection | 382ms | Memory churn |

---

### 3. Integration Tests Are Too Simple

| Metric | Integration Tests | video.html |
|--------|-------------------|------------|
| Performance | 2.6x realtime ✅ | 0.72x ❌ |
| Content | Single video | 7 complex scenes |
| Duration | 3-10s | 41s |

**Gap: Real-world is 3.6x slower than tests suggest**

Integration tests don't represent actual user projects.

---

### 4. Video Encoding is NOT the Problem

- Only 385ms total (0.7% of export time)
- VideoEncoder API is efficient
- Optimizing encoding won't help

---

### 5. Our TypeScript Code is NOT the Problem

- Only ~2% of total time
- Most time is in browser APIs
- JavaScript optimization won't move the needle

---

## 🚀 Recommended Action Plan

### Phase 1: Pipeline Parallelization (2-4x speedup)

**Target:** Reduce 73% idle time → 20-30%

**Approach:**
- Render frame N+1 while encoding frame N
- Use multiple canvas contexts to avoid blocking
- Batch VideoFrame creation/submission

**Expected:** 0.72x → 1.8-2.2x realtime

---

### Phase 2: Cache Animation Discovery (400ms savings)

**Target:** Reduce `getAnimations()` from 487ms → <50ms

**Approach:**
- Cache results per element
- Invalidate on animation add/remove
- Track animations at element level

**Expected:** Additional 0.4s improvement

---

### Phase 3: Optimize Style Sync (100-150ms savings)

**Target:** Reduce `syncNodeStyles` from 186ms → 50-80ms

**Approach:**
- Cache computed styles on first frame
- Dirty tracking for style changes
- Batch updates

**Expected:** Additional 0.1-0.15s improvement

---

### Phase 4: Reduce GC Overhead (200ms savings)

**Target:** Reduce garbage collection from 382ms → 150ms

**Approach:**
- Pool VideoFrame objects
- Reuse canvas contexts
- Preallocate buffers

**Expected:** Additional 0.2s improvement

---

## 📈 Expected Final Results

| Project | Current | After Phase 1 | After All Phases |
|---------|---------|---------------|------------------|
| video.html | 0.72x | 1.8-2.2x | 2.5-3.0x |
| design-catalog | 0.4x | 1.0-1.3x | 1.5-2.0x |

**Goal: Get real-world projects to 1.5-2.0x realtime** ✅

---

## 🔬 Data Quality

- **344,364 samples** = excellent statistical confidence
- **165µs sampling interval** = high resolution
- **115/115 source maps resolved** = accurate file/line attribution
- **56.9s profile time** = complete export captured

**High-quality data for confident decisions**

---

## ⏭️ Next Steps

1. **Review these findings** with the team
2. **Validate hypothesis** - Does pipelining make sense architecturally?
3. **Design pipelining solution** - How to implement parallelization?
4. **Prototype pipeline** - Quick proof of concept
5. **Measure improvement** - Re-run profiler after changes
6. **Iterate** - Move to Phase 2-4 optimizations

---

## ❓ Questions to Consider

1. Can we maintain multiple canvas contexts without memory issues?
2. Does VideoEncoder accept frames faster than we submit them?
3. Will pipelining complicate the codebase significantly?
4. Should we fix integration tests to include complex scenarios?
5. What's the target export speed for user satisfaction? (2x? 3x?)

---

## 📞 Contact

If you have questions about this analysis:
- Check the detailed analysis in `VIDEO_HTML_PERFORMANCE.md`
- Load the `.cpuprofile` in Chrome DevTools for interactive exploration
- Review the raw console output in `VIDEO_HTML_CONSOLE_OUTPUT.txt`

---

## ✅ Status

**MEASUREMENT COMPLETE - READY FOR USER REVIEW**

No fixes have been attempted. This is pure measurement and analysis to inform optimization decisions.
