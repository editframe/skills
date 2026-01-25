# Actual Performance Analysis - Post-Optimization Reality Check

**Analysis Date:** 2026-01-25  
**Analyst:** Performance profiling agent  
**Scope:** Real timing data from renderTimegroupToCanvas.browsertest.ts

---

## Executive Summary

**CRITICAL FINDING:** The optimizations show **MIXED RESULTS**, not the predicted 15-30x improvement.

### Reality vs Predictions

| Metric | Predicted | Actual | Result |
|--------|-----------|--------|--------|
| Overall test time | 15-30x faster | 6.7% faster | ❌ MAJOR MISS |
| Capture phase (30 frames native) | Much faster | 21% faster | ✅ IMPROVEMENT |
| Capture phase (6 frames native) | Much faster | 29% faster | ✅ IMPROVEMENT |
| Seek phase (complex HTML) | Same/better | 9% slower | ⚠️ REGRESSION |
| Overall throughput | ~3x faster | ~1.07x faster | ❌ UNDERPERFORMED |

**Key Finding:** The optimizations **ARE working** but the impact is **MUCH SMALLER** than predicted.

---

## Detailed Timing Comparison

### Test Execution Time

**Overall Performance:**
- Baseline: 21.60s test execution
- Optimized: 20.16s test execution
- **Improvement: -1.44s (-6.7%)**
- **Predicted: 15-30x → Reality: 1.07x**

### Test Case 1: 6 Frames Native (Batch Capture)

**Baseline (line 15):**
```
[captureBatch] 6 frames: clone=28ms, seek=38ms, capture=139ms, total=205ms
```

**Optimized (line 15):**
```
[captureBatch] 6 frames: clone=26ms, seek=42ms, capture=98ms, total=166ms
```

**Analysis:**
- Clone: 28ms → 26ms (-7%)
- Seek: 38ms → 42ms (+11%)  ⚠️
- **Capture: 139ms → 98ms (-29%)** ✅ GOOD
- **Total: 205ms → 166ms (-19%)** ✅

**Verdict:** Capture phase optimization **working**, but seek got slightly worse

---

### Test Case 2: 6 Frames ForeignObject

**Baseline (line 17):**
```
[captureBatch] 6 frames: clone=23ms, seek=43ms, capture=102ms, total=168ms
```

**Optimized (line 17):**
```
[captureBatch] 6 frames: clone=22ms, seek=33ms, capture=110ms, total=165ms
```

**Analysis:**
- Clone: 23ms → 22ms (-4%)
- Seek: 43ms → 33ms (-23%) ✅
- Capture: 102ms → 110ms (+8%) ⚠️
- **Total: 168ms → 165ms (-2%)**

**Verdict:** Minimal change overall

---

### Test Case 3: 30 Frames Native Video (CRITICAL)

**Baseline (line 23):**
```
[captureBatch] 30 frames: clone=36ms, seek=145ms, capture=575ms, total=755ms
```

**Optimized (line 23):**
```
[captureBatch] 30 frames: clone=29ms, seek=141ms, capture=453ms, total=623ms
```

**Analysis:**
- Clone: 36ms → 29ms (-19%) ✅
- Seek: 145ms → 141ms (-3%)
- **Capture: 575ms → 453ms (-21%)** ✅ GOOD
- **Total: 755ms → 623ms (-17%)** ✅

**Verdict:** Best result - capture optimization **working well**

---

### Test Case 4: 30 Frames ForeignObject Video

**Baseline (line 25):**
```
[captureBatch] 30 frames: clone=29ms, seek=128ms, capture=345ms, total=502ms
```

**Optimized (line 25):**
```
[captureBatch] 30 frames: clone=36ms, seek=122ms, capture=353ms, total=510ms
```

**Analysis:**
- Clone: 29ms → 36ms (+24%) ⚠️ REGRESSION
- Seek: 128ms → 122ms (-5%)
- Capture: 345ms → 353ms (+2%)
- **Total: 502ms → 510ms (+2%)** ⚠️ SLIGHT REGRESSION

**Verdict:** Marginally **worse** after optimization

---

### Test Case 5: 30 Frames Complex HTML Native (CRITICAL REGRESSION)

**Baseline (line 31):**
```
[captureBatch] 30 frames: clone=15ms, seek=392ms, capture=20ms, total=428ms
```

**Optimized (line 31):**
```
[captureBatch] 30 frames: clone=14ms, seek=428ms, capture=21ms, total=463ms
```

**Analysis:**
- Clone: 15ms → 14ms (-7%)
- **Seek: 392ms → 428ms (+36ms, +9%)** ❌ REGRESSION
- Capture: 20ms → 21ms (+5%)
- **Total: 428ms → 463ms (+8%)** ❌ REGRESSION

**Verdict:** **WORSE** after optimization - seek time increased significantly

---

### Test Case 6: 30 Frames Complex HTML ForeignObject

**Baseline (line 33):**
```
[captureBatch] 30 frames: clone=22ms, seek=510ms, capture=21ms, total=553ms
```

**Optimized (line 33):**
```
[captureBatch] 30 frames: clone=17ms, seek=386ms, capture=19ms, total=422ms
```

**Analysis:**
- Clone: 22ms → 17ms (-23%) ✅
- **Seek: 510ms → 386ms (-24%)** ✅ GOOD
- Capture: 21ms → 19ms (-10%)
- **Total: 553ms → 422ms (-24%)** ✅ GOOD

**Verdict:** Significant **improvement**

---

### Test Case 7: Visual Regression Test (30 frames)

**Baseline (line 35):**
```
[captureBatch] 30 frames: clone=30ms, seek=184ms, capture=497ms, total=711ms
```

**Optimized (line 35):**
```
[captureBatch] 30 frames: clone=23ms, seek=125ms, capture=383ms, total=531ms
```

**Analysis:**
- Clone: 30ms → 23ms (-23%) ✅
- Seek: 184ms → 125ms (-32%) ✅
- **Capture: 497ms → 383ms (-23%)** ✅
- **Total: 711ms → 531ms (-25%)** ✅ EXCELLENT

**Verdict:** Strong improvement

---

### Test Case 8: Nested Animated Timegroup (3 frames native)

**Baseline (line 51):**
```
[captureBatch] 3 frames: clone=150ms, seek=96ms, capture=82ms, total=327ms
```

**Optimized (line 51):**
```
[captureBatch] 3 frames: clone=17ms, seek=184ms, capture=98ms, total=299ms
```

**Analysis:**
- **Clone: 150ms → 17ms (-89%)** ✅ MASSIVE IMPROVEMENT
- **Seek: 96ms → 184ms (+92%)** ❌ MASSIVE REGRESSION
- Capture: 82ms → 98ms (+20%) ⚠️
- **Total: 327ms → 299ms (-9%)**

**Verdict:** Clone reuse **working brilliantly**, but seek and capture got **much worse**

---

## Pattern Analysis

### What's Working ✅

1. **Capture Phase Optimization (Video Content)**
   - 6 frames: 29% faster
   - 30 frames: 21% faster
   - Visual regression test: 23% faster
   - **Native API is faster for video capture**

2. **Clone Structure Reuse (When Applied)**
   - Nested animated: 150ms → 17ms (89% faster)
   - **Clone reuse optimization working as designed**

3. **Visual Regression Test Performance**
   - 25% overall improvement
   - All phases improved
   - **Best-case scenario for optimizations**

### What's NOT Working ❌

1. **Seek Time Regressions**
   - Complex HTML native: +36ms (+9%)
   - Nested animated: +88ms (+92%)
   - **Something made seeking WORSE**

2. **Clone Time Inconsistency**
   - Sometimes faster, sometimes slower
   - 30 frames foreignObject: +24% worse
   - **Clone reuse not always applied?**

3. **Overall Throughput**
   - Only 7% faster overall
   - Expected 15-30x
   - **Major prediction miss**

---

## Root Cause Analysis

### Why Predictions Failed

#### Prediction 1: Native API = 1.76x Faster
**Reality:** Only ~20% faster in actual tests

**Reasons:**
- Baseline measurement was synthetic benchmark, not real-world test
- Real tests have overhead from test infrastructure
- Capture phase is only one part of total time
- Seek + clone phases dominate some workloads

---

#### Prediction 2: RAF Removal = 152x Faster
**Reality:** Not visible in these tests

**Reasons:**
- RAF wait was **already not used** in batch capture mode
- Only affects specific code paths (waitForPaint: true)
- These tests use default immediate mode
- **Optimization applies to different use case**

---

#### Prediction 3: CSS Cache = 2.2x Faster
**Reality:** Not measurable in these specific tests

**Reasons:**
- These are render tests, not repeated property sync tests
- CSS cache helps during playback/scrubbing
- **Wrong tests to measure this optimization**

---

#### Prediction 4: Clone Reuse = 1.3x Faster
**Reality:** **89% improvement when applied**, but inconsistent

**Reasons:**
- Working brilliantly in nested animated test (150ms → 17ms)
- **NOT applied consistently** across all batch captures
- May only trigger in specific scenarios
- **Needs investigation**: Why isn't it always reusing?

---

## Critical Issues Discovered

### Issue 1: Seek Time Regression (High Priority) 🔴

**Symptom:**
- Complex HTML native: seek increased 392ms → 428ms (+9%)
- Nested animated: seek increased 96ms → 184ms (+92%)

**Impact:** **Makes some workloads SLOWER overall**

**Hypothesis:**
1. Native rendering path has different timing that affects seek readiness
2. Content ready detection changed behavior
3. Video decode scheduling affected
4. Possible unintended consequence of RAF removal

**Action Required:**
- Profile seek operation in isolation
- Compare native vs foreignObject seek behavior
- Check if contentReadyMode changes affected seeking
- May need to revert or adjust timing logic

---

### Issue 2: Clone Reuse Not Consistent (Medium Priority) 🟡

**Symptom:**
- Nested animated: 89% clone improvement
- 30 frames foreignObject: 24% clone **regression**
- Inconsistent application across tests

**Impact:** Missing optimization benefits in many cases

**Hypothesis:**
1. Clone reuse only works in specific batch capture modes
2. Conditions for reuse too strict
3. Cache invalidation too aggressive
4. Different code paths for different test scenarios

**Action Required:**
- Trace captureBatch calls to see when reuse happens
- Check cache invalidation logic
- Ensure all batch modes benefit from reuse
- Add logging to track reuse hits/misses

---

### Issue 3: Prediction Methodology Flawed (Low Priority) 🟢

**Symptom:**
- 15-30x prediction vs 1.07x reality
- Order of magnitude mismatch

**Impact:** Incorrect expectations, potential over-optimization

**Hypothesis:**
1. Synthetic benchmarks don't match real-world usage
2. Optimizations target wrong hot paths
3. Test infrastructure overhead not accounted for
4. Multiplicative assumptions when reality is additive

**Action Required:**
- Re-baseline predictions using integration tests, not benchmarks
- Profile actual user workflows, not isolated operations
- Adjust methodology for future optimizations

---

## Performance Breakdown by Phase

### Clone Phase Performance

| Test Case | Baseline | Optimized | Change | Status |
|-----------|----------|-----------|--------|--------|
| 6 frames native | 28ms | 26ms | -7% | ✅ |
| 6 frames foreign | 23ms | 22ms | -4% | ✅ |
| 30 frames native video | 36ms | 29ms | -19% | ✅ |
| 30 frames foreign video | 29ms | 36ms | +24% | ❌ |
| 30 frames native HTML | 15ms | 14ms | -7% | ✅ |
| 30 frames foreign HTML | 22ms | 17ms | -23% | ✅ |
| Visual regression (30) | 30ms | 23ms | -23% | ✅ |
| Nested animated (3) | 150ms | 17ms | **-89%** | ✅✅ |

**Average:** -16% (or -70% if clone reuse applied)

---

### Seek Phase Performance

| Test Case | Baseline | Optimized | Change | Status |
|-----------|----------|-----------|--------|--------|
| 6 frames native | 38ms | 42ms | +11% | ⚠️ |
| 6 frames foreign | 43ms | 33ms | -23% | ✅ |
| 30 frames native video | 145ms | 141ms | -3% | ✅ |
| 30 frames foreign video | 128ms | 122ms | -5% | ✅ |
| 30 frames native HTML | 392ms | 428ms | **+9%** | ❌ |
| 30 frames foreign HTML | 510ms | 386ms | -24% | ✅ |
| Visual regression (30) | 184ms | 125ms | -32% | ✅ |
| Nested animated (3) | 96ms | 184ms | **+92%** | ❌❌ |

**Average:** -1% (mixed results, two major regressions)

---

### Capture Phase Performance

| Test Case | Baseline | Optimized | Change | Status |
|-----------|----------|-----------|--------|--------|
| 6 frames native | 139ms | 98ms | **-29%** | ✅ |
| 6 frames foreign | 102ms | 110ms | +8% | ⚠️ |
| 30 frames native video | 575ms | 453ms | **-21%** | ✅ |
| 30 frames foreign video | 345ms | 353ms | +2% | ⚠️ |
| 30 frames native HTML | 20ms | 21ms | +5% | ⚠️ |
| 30 frames foreign HTML | 21ms | 19ms | -10% | ✅ |
| Visual regression (30) | 497ms | 383ms | **-23%** | ✅ |
| Nested animated (3) | 82ms | 98ms | +20% | ⚠️ |

**Average:** -9% (good for video, mixed for HTML)

---

## Recommendations

### Immediate Actions 🔴

1. **Investigate Seek Regressions**
   - Why did native path seek time increase?
   - Profile seek operation in isolation
   - Check timing coordination between seek and render
   - Consider reverting native path changes if causing issues

2. **Fix Clone Reuse Consistency**
   - Understand why 30-frame foreign video got WORSE
   - Trace when clone reuse is applied vs not applied
   - Ensure all captureBatch calls benefit from reuse
   - Add instrumentation to track cache hits

3. **Run Correct Tests for Each Optimization**
   - CSS cache needs property sync tests, not render tests
   - RAF removal needs tests with waitForPaint: true
   - Current tests don't measure several optimizations

---

### Short-Term Analysis 🟡

4. **Create Accurate Performance Baseline**
   - Use integration tests, not synthetic benchmarks
   - Measure actual user workflows
   - Account for test infrastructure overhead
   - Set realistic improvement expectations

5. **Profile Hot Paths**
   - Why is seek time so variable?
   - Why is clone sometimes faster, sometimes slower?
   - What's causing the 92% seek regression?
   - Use Chrome DevTools on actual test execution

6. **Validate Each Optimization Individually**
   - Test native API in isolation
   - Test clone reuse in isolation
   - Test CSS cache in isolation
   - Measure actual impact per optimization

---

### Long-Term Strategy 🟢

7. **Adjust Optimization Strategy**
   - Focus on operations that are actually slow
   - Avoid micro-optimizations that don't matter
   - Profile real-world usage patterns
   - Measure before predicting

8. **Comprehensive Performance Suite**
   - Tests for each optimization target
   - Regression detection for each phase
   - Automated performance tracking
   - Clear metrics per code path

---

## Conclusion

### The Hard Truth

**Optimizations are working** - just not as predicted:
- ✅ Capture phase: 20-30% faster for video
- ✅ Clone reuse: 89% faster when applied
- ⚠️ Seek phase: Inconsistent, some regressions
- ❌ Overall: 7% faster vs 15-30x predicted

### Root Cause of Disappointment

1. **Wrong tests measured** - These tests don't exercise RAF removal, CSS cache
2. **Clone reuse not always applied** - Inconsistent benefits
3. **Seek regressions** - New bottleneck introduced
4. **Baseline vs reality** - Synthetic benchmarks misled predictions

### What Actually Happened

The optimizations **are implemented correctly** but:
- They optimize code paths **not heavily used** in these tests
- They introduced **new issues** (seek regression)
- They have **inconsistent application** (clone reuse)
- **Real-world impact** much smaller than lab benchmarks suggested

### Next Steps

**Priority 1:** Fix the seek time regression (9-92% slower)  
**Priority 2:** Make clone reuse work consistently  
**Priority 3:** Run tests that actually measure RAF removal and CSS cache  
**Priority 4:** Re-baseline with realistic expectations

---

**Analysis Status:** ✅ **COMPLETE**  
**Actual Performance:** 1.07x faster (not 15-30x)  
**Critical Issues:** 2 regressions found  
**Recommendation:** Investigate and fix seek regression before considering optimizations complete
