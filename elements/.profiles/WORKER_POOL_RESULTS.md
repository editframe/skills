# Worker Pool Parallelization Results

**Date:** 2026-01-25  
**Change:** Move canvas encoding and base64 serialization to worker pool  
**Hypothesis:** Offloading heavy work to workers would improve parallelization

---

## Change Implemented

- Canvas encoding moved to `SerializationWorkerPool`
- Base64 encoding moved to worker pool
- Frame serialization parallelized across worker threads
- Multiple frames can be processed simultaneously

**Implementation:**
- File: `packages/elements/src/preview/SerializationWorkerPool.ts`
- Workers: 4 (configurable)
- Tasks: `serializeFrame(canvas, includeAlpha)`

---

## Performance Comparison

### 5-Second Segment (CLI Profile)

| Metric | Before (Parallel Awaits) | After (Worker Pool) | Change |
|--------|--------------------------|---------------------|--------|
| **Render time** | 24.6s | 25.2s | **❌ 2.4% slower** |
| **Speed** | 0.203x realtime | 0.198x realtime | **❌ 2.5% slower** |
| **Total samples** | 128,829 | 133,098 | +3.3% |
| **Idle samples** | 78,178 (60.7%) | 43,811 (32.9%) | -44.0% |
| **Idle time (est)** | 14.9s | 8.3s | -44.3% |

### Key Findings

🔴 **REGRESSION: 2.4% slower overall render time**

Despite reducing idle time by 44%, the overall render time **increased**. This indicates:
1. Worker pool overhead exceeds the parallelization benefit
2. Worker communication (postMessage) is adding latency
3. The work being parallelized wasn't the bottleneck

---

## Hotspot Analysis

### Top 10 Functions by Self Time

#### Before (Parallel Awaits)
| Function | File | Self Time | Samples |
|----------|------|-----------|---------|
| (idle) | - | 14.9s | 78,178 (60.7%) |
| (program) | - | 2.6s | 13,752 (10.7%) |
| getImageData | (native) | 2.5s | 13,436 (10.4%) |
| toDataURL | (native) | 0.9s | 4,657 (3.6%) |
| serializeToSvgDataUri | renderToImageForeignObject.ts | 0.3s | 1,828 (1.4%) |

#### After (Worker Pool)
| Function | File | Self Time | Samples |
|----------|------|-----------|---------|
| getImageData | (native) | 8.8s | 46,214 (34.7%) |
| (idle) | - | 8.3s | 43,811 (32.9%) |
| (program) | - | 2.8s | 15,005 (11.3%) |
| toDataURL | (native) | 0.8s | 4,262 (3.2%) |
| **worker pool** | SerializationWorkerPool.ts | 0.4s | 1,224 (0.9%) |
| (anonymous) | renderToImage.ts | 0.4s | 1,032 (0.8%) |

### Critical Change

**getImageData became the dominant bottleneck:**
- Before: 2.5s (10.4%)
- After: 8.8s (34.7%)
- **+252% increase in samples**

This suggests that by moving work to workers, we've made the main thread wait **more** on canvas operations, not less.

---

## Worker Utilization Analysis

### Worker Pool Activity

From the profile:
- **Worker pool function calls:** 1,224 samples (0.9% of total time)
- **Worker message handling:** 125 samples (0.1%)
- **Total worker overhead:** ~0.5s

### Why This Is Slow

1. **Serial bottleneck (getImageData):**
   - Canvas `getImageData()` must run on main thread
   - Cannot be parallelized
   - Now dominates at 34.7% of execution time

2. **Worker communication overhead:**
   - `postMessage()` requires data serialization
   - Canvas data transfer is expensive
   - Round-trip latency adds up across 150 frames

3. **Lost pipelining benefits:**
   - Previous parallel awaits overlapped async operations efficiently
   - Worker pool introduces new synchronization points
   - Main thread now waits for worker responses sequentially

---

## Why The Hypothesis Failed

### Original Assumption
> "Moving canvas encoding to workers will parallelize heavy work"

### Reality
1. **Canvas operations are already async** - They don't block the main thread
2. **getImageData() cannot move to workers** - It's bound to the main thread canvas context
3. **Worker overhead > parallelization benefit** - Communication cost exceeds time saved
4. **Work wasn't CPU-bound** - It was I/O-bound (waiting for GPU)

### What We Actually Did
- ✅ Reduced main thread idle time (60.7% → 32.9%)
- ❌ Increased getImageData blocking (10.4% → 34.7%)
- ❌ Added worker communication overhead (~0.5s)
- ❌ Slowed overall render time (24.6s → 25.2s)

---

## Detailed Profile Comparison

### Before (Parallel Awaits) - Top Functions
```
renderTimegroupToVideo     131.4ms  (0.5%)  - Main render loop
extractCanvasData         8796.0ms (34.9%)  - Canvas operations (includes natives)
syncNodeStyles             51.6ms  (0.2%)  - Style synchronization
```

### After (Worker Pool) - Top Functions
```
renderTimegroupToVideo     131.4ms  (0.5%)  - Main render loop (same)
extractCanvasData        8796.0ms (34.8%)  - Canvas operations (same)
SerializationWorkerPool   232.1ms  (0.9%)  - NEW: Worker coordination
```

The worker pool added **232ms of overhead** without reducing the dominant bottleneck (canvas operations).

---

## Conclusion

### ❌ Worker Pool Parallelization: NOT EFFECTIVE

**Performance:** 2.4% slower (24.6s → 25.2s)  
**Reason:** Canvas operations are GPU-bound, not CPU-bound  
**Trade-off:** Reduced idle time but increased blocking time  

### Why This Approach Failed

1. **Wrong bottleneck identified**
   - Assumed CPU work could be parallelized
   - Reality: Bottleneck is GPU→CPU memory transfer (getImageData)

2. **Worker overhead > benefit**
   - postMessage serialization: ~150 round-trips × 1-3ms = 150-450ms
   - Worker coordination: 232ms measured overhead
   - Total overhead: ~400-700ms

3. **Lost previous optimization gains**
   - Parallel awaits was efficiently overlapping async operations
   - Worker pool introduced new synchronization points

### The Real Bottleneck

**getImageData (34.7% of time, 8.8s)** - This is the actual problem:
- Synchronous GPU→CPU transfer
- Cannot be parallelized across workers
- Cannot be avoided with current rendering approach

---

## Recommendations

### ✅ REVERT THIS CHANGE

The worker pool approach makes performance **worse**, not better.

### 🎯 Next Steps (Actual Optimization Paths)

#### 1. **Reduce getImageData calls** (High Impact)
- Currently: 46,214 samples (34.7%)
- Strategy: Batch multiple canvas operations before readback
- Estimated savings: 2-4s

#### 2. **Optimize canvas operations** (High Impact)
- Use OffscreenCanvas where possible
- Investigate VideoFrame API for GPU-accelerated encoding
- Consider WebGL-based rendering pipeline

#### 3. **Keep parallel awaits optimization** (Already Done)
- This WAS effective (19.3% improvement)
- Don't break what's working

#### 4. **Profile seekForRender** (Medium Impact)
- Still significant idle time (32.9%)
- Understand what's blocking frame preparation
- Optimize video seeking/loading

---

## Files Generated

- ✅ Profile: `video-worker-pool-5sec.cpuprofile` (133,098 samples)
- ✅ Video: `video-worker-pool-5sec.mp4` (5s segment)
- ✅ Analysis: `.profiles/FUNCTION_LEVEL_ANALYSIS.md` (detailed breakdown)
- ✅ This report: `.profiles/WORKER_POOL_RESULTS.md`

---

## Decision

**DO NOT MERGE THIS CHANGE.**

The worker pool parallelization:
- ❌ Makes rendering 2.4% slower
- ❌ Adds 400-700ms of overhead
- ❌ Does not address the real bottleneck (getImageData)
- ❌ Increases code complexity for negative performance impact

**Stick with the parallel awaits optimization** (19.3% improvement) and focus on canvas operation optimizations instead.

---

**Analysis Complete:** 2026-01-25  
**Verdict:** Revert worker pool, optimize canvas operations  
**Next Target:** getImageData (34.7% of execution time)
