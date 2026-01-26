# Style Observer Assessment: @bramus/style-observer for Reducing Style Copies

**Date:** 2026-01-26  
**Test File:** `style-observer-assessment.browsertest.ts`

## Executive Summary

After measuring actual performance, **@bramus/style-observer is NOT recommended** for the `renderTimegroupToCanvas` system despite showing potential for 86% time savings in hypothetical scenarios. The library doesn't eliminate the need for `getComputedStyle()` calls in source-to-clone copying, and better optimization strategies exist.

## Key Measurements

### 1. getComputedStyle() Cost (Actual)
- **Finding:** `getComputedStyle()` is virtually free (<0.1% of sync time)
- Average per frame: 0.00ms for 6 nodes
- Average full sync time: 0.26ms per frame
- **Conclusion:** The bottleneck is NOT in reading styles

### 2. Property Change Rate
- **Total property reads:** 3,540 (60 frames × 59 properties)
- **Total property changes:** 59 (1.7% change rate)
- **Most frequently changing:** `transform` (98.3% of all changes)
- **Static properties:** 58 out of 59 properties NEVER changed
- **Conclusion:** 98.3% of style reads are redundant

### 3. Style Observer Overhead
- **Setup cost:** 0.10-0.30ms per element
- **For 20 elements:** ~2-6ms one-time setup
- **Direct polling:** 0.001-0.002ms per read (extremely cheap)
- **Conclusion:** Setup cost is non-trivial but could pay off after ~7-8 frames

### 4. Hypothetical Observer Approach
**Scenario:** 12 elements (10 static, 2 animated) × 60 frames

| Approach | Total Time | Per Frame | At 30fps |
|----------|------------|-----------|----------|
| Current (sync all) | 32.30ms | 0.538ms | 16.15ms/sec |
| Observer (sync changed only) | 4.30ms | 0.012ms | 0.35ms/sec |
| **Savings** | **86.7%** | **97.8%** | **97.8%** |

**Break-even:** 7 frames

### 5. Read vs Write Cost Breakdown
For 1000 iterations, 3 elements, 2 properties each:

| Operation | Time | Per Iteration | Overhead |
|-----------|------|---------------|----------|
| Read only | 2.30ms | 0.002ms | baseline |
| Read + write (same values) | 3.00ms | 0.003ms | +30.4% |
| Read + write (new values) | 1.30ms | 0.001ms | -43.5% |

**Finding:** Browsers optimize redundant style writes efficiently.

### 6. Architectural Mismatch Test
**WITH observer:** 0.070ms/frame  
**WITHOUT observer:** 0.030ms/frame  
**Difference:** Observer is actually **slower** by 0.040ms/frame

**Key Finding:** Observer callbacks don't eliminate the need for `getComputedStyle()`:
- Observer tells us WHEN a change happened
- We still need to call `getComputedStyle()` to get the computed value
- We still need to copy that value to the clone

## Why @bramus/style-observer Won't Help

### Problem 1: Doesn't Eliminate getComputedStyle()
The observer fires callbacks when properties change, but:
1. The callback values may not reflect final computed values (e.g., cascading, inheritance)
2. We need the **exact computed values** from the source to copy to clones
3. We still need to call `getComputedStyle(sourceElement)` even when observer fires

### Problem 2: Architectural Mismatch
- **Library purpose:** Observe live element changes asynchronously
- **Our need:** Synchronous style snapshot at render time for source→clone copying
- **Mismatch:** Observer notifies AFTER changes; we need values NOW during frame render

### Problem 3: Adds Overhead Without Benefit
- Setup cost: ~0.10-0.30ms per element
- Must still call `getComputedStyle()` in observer callback
- Adds callback overhead and async complexity
- Measured **slower** than direct polling (0.070ms vs 0.030ms per frame)

### Problem 4: Conflicts with Rendering System
The system explicitly disables CSS transitions for accurate rendering:
```typescript
cloneStyle.animation = "none";
cloneStyle.transition = "none";
```

`@bramus/style-observer` works by attaching CSS transitions to observed properties - this would interfere with rendering.

## What WOULD Actually Help

Based on measurements showing 98.3% of style reads are redundant:

### 1. ✅ Delta Tracking (Already Implemented!)
The current system already has this optimization:
- Tracks visibility changes between frames
- Only full-syncs newly visible nodes
- Skips hidden nodes entirely
- Incremental sync for still-visible nodes

**Current code:**
```typescript
function syncStylesWithIndex(state: SyncState, timeMs: number): void {
  const visibleSet = new Set<CloneNode>();
  buildVisibleSetRecursive(state.tree.root, timeMs, visibleSet);
  
  const delta = computeVisibilityDelta(state.previousVisibleSet, visibleSet);
  // nowVisible: full sync
  // stillVisible: incremental sync  
  // nowHidden: just hide
}
```

### 2. Property-Level Dirty Tracking (Potential Improvement)
Since 98.3% of properties never change:

**Static properties** (can skip after initial sync):
- Layout: `width`, `height`, `padding`, `margin`, `border`
- Positioning: `position`, `top`, `left`, `right`, `bottom`
- Typography: `font`, `textAlign`, `letterSpacing`
- Most visual effects: `borderRadius`, `boxShadow`, `filter`

**Dynamic properties** (always sync):
- `transform` (animations)
- `opacity` (transitions)
- `display`, `visibility` (temporal culling)
- Text content (captions, user input)

**Approach:**
```typescript
const STATIC_PROPERTIES = ["width", "height", "padding", ...];
const DYNAMIC_PROPERTIES = ["transform", "opacity", "display", ...];

function syncNodeStyles(node: CloneNode, isInitial: boolean) {
  if (isInitial) {
    // First sync: copy all properties
    syncProperties(node, ALL_PROPERTIES);
  } else {
    // Subsequent syncs: only dynamic properties
    syncProperties(node, DYNAMIC_PROPERTIES);
  }
}
```

**Estimated savings:** 90% of property reads (58/59 properties are static)

### 3. Element-Level Dirty Tracking (Potential Improvement)
Track which elements have potential for change:

**Potentially dynamic elements:**
- Elements with CSS animations/transitions
- Elements with JavaScript-driven animations
- Input elements
- Caption elements (text changes)
- Video/image canvases (visual content updates)

**Static elements:**
- Text containers with no animations
- Layout containers
- Static overlays

**Approach:**
```typescript
interface CloneNode {
  // ...
  isDynamic: boolean;  // Set during buildCloneStructure
}

function syncNodeWithDelta(node: CloneNode, visibleSet: Set<CloneNode>) {
  if (!visibleSet.has(node)) {
    node.clone.style.display = "none";
    return;
  }
  
  if (delta.nowVisible.has(node)) {
    syncNodeStyles(node); // Full sync
  } else if (delta.stillVisible.has(node) && node.isDynamic) {
    syncNodeStyles(node); // Only sync if element can change
  }
  // Skip sync for static elements that are still visible
}
```

**Estimated savings:** Depends on scene complexity (10 static, 2 dynamic = 83% skip rate)

### 4. Browser-Native Optimizations (Already Leveraged!)
The system already uses:
- `computedStyleMap()` when available (~15% faster than `getComputedStyle`)
- Browser's internal optimization of redundant style writes
- Default value skipping to reduce serialized HTML size

## Recommendations

### ❌ Do NOT Use @bramus/style-observer
- Doesn't eliminate `getComputedStyle()` calls
- Adds overhead without benefit
- Architectural mismatch for synchronous rendering
- Conflicts with transition-disabled rendering

### ✅ Current System is Well-Optimized
The existing implementation already has:
- Delta tracking (only sync visibility changes)
- Temporal culling (skip hidden nodes)
- Default value skipping
- Native `computedStyleMap()` support

### ✅ Consider Future Optimizations (If Needed)

**Priority 1: Property-Level Dirty Tracking**
- Highest potential savings (90% of property reads)
- Low implementation complexity
- No architectural changes needed

**Priority 2: Element-Level Dirty Tracking**  
- Moderate savings (depends on scene)
- Requires analysis of element capabilities
- Could integrate with existing delta tracking

**Priority 3: Per-Property Change Detection**
- Mark properties that CAN change (animations, interactions)
- Skip properties that are guaranteed static
- Could cache property mutability during build phase

## Conclusion

Thank you for pushing back on the initial assessment. The measurements reveal:

1. **Current bottleneck is NOT `getComputedStyle()`** (< 0.1% of time)
2. **Actual bottleneck is REDUNDANT syncing** (98.3% of reads are static)
3. **@bramus/style-observer doesn't solve this** (still need getComputedStyle)
4. **Better solutions exist** (property-level and element-level dirty tracking)

The current system is already well-optimized with delta tracking. If further optimization is needed, focus on avoiding redundant property reads rather than trying to optimize the read operation itself.

**Performance is acceptable for current use cases** (0.26-0.54ms per frame). Optimizations should only be pursued if profiling shows sync as a bottleneck in production scenarios.
