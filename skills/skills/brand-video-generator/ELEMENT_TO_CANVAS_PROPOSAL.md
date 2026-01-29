# Element-to-Canvas Rendering: Assessment & Proposal

## Executive Summary

**Current State**: The system can render entire timegroups to canvas/video via `renderTimegroupToVideo()` and `captureTimegroupAtTime()`.

**Goal**: Extend this capability to render **arbitrary elements** (not just timegroups) to canvas surfaces, respecting the root timegroup's timeline position.

**Key Challenge**: Timeline control system - elements need to be rendered at the time of their root timegroup, which requires seeking/coordination.

**Recommendation**: **Approach 3 (Unified Render Primitive)** - Best balance of flexibility, maintainability, and performance.

---

## Current System Analysis

### What Works Today

1. **Timegroup-to-Canvas Rendering** (`renderTimegroupToVideo.ts`)
   - Creates a render clone of entire timegroup
   - Seeks clone to target time using `seekForRender()`
   - Serializes DOM to SVG foreignObject via `serializeTimelineDirect.ts`
   - Encodes canvases to base64 data URIs
   - Renders to image and encodes to video

2. **Timeline Control System** (`EFTimegroup.ts`)
   - Root timegroups have `seekForRender()` method
   - Coordinates all child elements via `FrameController`
   - Updates animations via `updateAnimations()`
   - Executes custom frame tasks
   - Ensures all elements are at correct visual state for a given time

3. **Serialization Pipeline** (`serializeTimelineDirect.ts`)
   - Walks DOM tree recursively
   - Handles shadow DOM (custom elements with canvases)
   - Encodes canvases to data URIs in parallel
   - Checks temporal visibility (skips elements outside time bounds)
   - Outputs SVG foreignObject with embedded content

### What's Missing

**No way to render a single element to canvas** while respecting timeline position:
- Can't render just an `ef-video` element
- Can't render a `div` containing multiple temporal elements  
- Can't render arbitrary subtrees of the timeline

**Why this matters for your use cases:**
- **Motion blur**: Need to render moving element at multiple sub-frame times
- **Canvas effects**: Need to apply shaders to specific elements
- **HTML-to-shader loops**: Need to render HTML content as texture input

---

## Proposed Approaches

### Approach 1: Element-Specific Render Method

**Concept**: Add `renderToCanvas()` method to temporal elements.

```typescript
// On any temporal element
const canvas = await element.renderToCanvas({
  timeMs: 1000,  // Render at this time
  scale: 1.0,
  width: 1920,
  height: 1080
});
```

**Implementation**:
```typescript
// In EFTemporal mixin
async renderToCanvas(options: RenderToCanvasOptions): Promise<HTMLCanvasElement> {
  // 1. Find root timegroup
  const root = this.rootTimegroup;
  if (!root) throw new Error("Element must be in a timegroup");
  
  // 2. Create render clone of root
  const { clone, cleanup } = await root.createRenderClone();
  
  // 3. Find corresponding element in clone
  const clonedElement = findCorrespondingElement(clone, this);
  
  // 4. Seek clone to target time
  await clone.seekForRender(options.timeMs);
  
  // 5. Serialize just this element (not whole tree)
  const xhtml = await serializeElementToXHTML(clonedElement, options);
  
  // 6. Render to canvas
  const canvas = await renderXHTMLToCanvas(xhtml, options);
  
  cleanup();
  return canvas;
}
```

**Pros**:
- ✅ Simple, intuitive API
- ✅ Works on any temporal element
- ✅ Respects timeline position automatically

**Cons**:
- ❌ Requires element identity tracking (how to find element in clone?)
- ❌ Creates full render clone even for single element
- ❌ Duplicates logic from timegroup rendering
- ❌ Doesn't work for non-temporal elements (plain divs)

---

### Approach 2: Canvas Target System

**Concept**: Elements can declare themselves as "canvas targets" that get rendered to surfaces.

```typescript
// Declarative approach
<ef-video 
  src="video.mp4" 
  canvas-target="motion-blur-surface"
/>

<ef-canvas-surface 
  id="motion-blur-surface"
  width="1920"
  height="1080"
  render-mode="continuous"  // or "on-demand"
/>
```

**Implementation**:
```typescript
// New element: EFCanvasSurface
class EFCanvasSurface extends LitElement {
  @property() targetElementId?: string;
  
  private canvas: HTMLCanvasElement;
  private renderContext: RenderContext;
  
  async refresh() {
    const targetElement = document.getElementById(this.targetElementId);
    if (!targetElement) return;
    
    // Render target element to this canvas
    await renderElementToCanvas(targetElement, this.canvas, {
      timeMs: this.rootTimegroup?.currentTimeMs ?? 0
    });
  }
}
```

**Pros**:
- ✅ Declarative, fits web component model
- ✅ Can be used in HTML templates
- ✅ Automatic updates when timeline changes
- ✅ Good for persistent surfaces (motion blur accumulation)

**Cons**:
- ❌ More complex API surface
- ❌ Still needs element identity/tracking
- ❌ Overkill for one-off renders
- ❌ Requires new element types

---

### Approach 3: Unified Render Primitive (RECOMMENDED)

**Concept**: Extract core rendering logic into a standalone function that works for any DOM subtree.

```typescript
/**
 * Render any element to canvas at a specific time.
 * Works for timegroups, temporal elements, or plain DOM.
 */
async function renderElementToCanvas(
  element: Element,
  options: RenderElementOptions
): Promise<HTMLCanvasElement> {
  const {
    timeMs,           // Time to render at
    scale = 1.0,      // Output scale
    width,            // Override width (default: element.offsetWidth)
    height,           // Override height (default: element.offsetHeight)
    rootTimegroup,    // Optional: root for timeline control
  } = options;
  
  // 1. Determine timeline control strategy
  const root = rootTimegroup ?? findRootTimegroup(element);
  
  if (root) {
    // TIMELINE-AWARE PATH: Element is in a timeline
    return await renderElementWithTimeline(element, root, options);
  } else {
    // STATIC PATH: Element is standalone (no timeline)
    return await renderElementStatic(element, options);
  }
}
```

**Timeline-aware implementation**:
```typescript
async function renderElementWithTimeline(
  element: Element,
  root: EFTimegroup,
  options: RenderElementOptions
): Promise<HTMLCanvasElement> {
  // 1. Create render clone of root timegroup
  const { clone: rootClone, cleanup } = await root.createRenderClone();
  
  // 2. Find corresponding element in clone
  // Use data-element-id or structural path
  const clonedElement = findCorrespondingElement(rootClone, element);
  
  // 3. Seek clone to target time
  await rootClone.seekForRender(options.timeMs);
  
  // 4. Serialize just the target element subtree
  const width = options.width ?? element.offsetWidth;
  const height = options.height ?? element.offsetHeight;
  
  const xhtml = await serializeElementToXHTML(clonedElement, width, height, {
    canvasScale: options.scale,
    timeMs: options.timeMs,
    renderContext: new RenderContext(),
  });
  
  // 5. Render to canvas
  const canvas = await renderXHTMLToCanvas(xhtml, width, height);
  
  cleanup();
  return canvas;
}
```

**Static implementation** (no timeline):
```typescript
async function renderElementStatic(
  element: Element,
  options: RenderElementOptions
): Promise<HTMLCanvasElement> {
  // No seeking needed - just serialize current state
  const width = options.width ?? element.offsetWidth;
  const height = options.height ?? element.offsetHeight;
  
  const xhtml = await serializeElementToXHTML(element, width, height, {
    canvasScale: options.scale,
    timeMs: 0,  // No timeline
    renderContext: new RenderContext(),
  });
  
  return await renderXHTMLToCanvas(xhtml, width, height);
}
```

**Element identity tracking**:
```typescript
/**
 * Find corresponding element in clone tree.
 * Uses data-element-id if available, otherwise structural path.
 */
function findCorrespondingElement(
  cloneRoot: Element,
  originalElement: Element
): Element {
  // Strategy 1: Use data-element-id if available
  const elementId = originalElement.getAttribute('data-element-id') 
                 || originalElement.id;
  if (elementId) {
    const found = cloneRoot.querySelector(`[data-element-id="${elementId}"]`)
               || cloneRoot.querySelector(`#${elementId}`);
    if (found) return found;
  }
  
  // Strategy 2: Use structural path (index-based)
  const path = getElementPath(originalElement);
  return followPath(cloneRoot, path);
}

function getElementPath(element: Element): number[] {
  const path: number[] = [];
  let current = element;
  
  while (current.parentElement) {
    const siblings = Array.from(current.parentElement.children);
    path.unshift(siblings.indexOf(current));
    current = current.parentElement;
  }
  
  return path;
}

function followPath(root: Element, path: number[]): Element {
  let current = root;
  for (const index of path) {
    current = current.children[index];
    if (!current) throw new Error("Path not found in clone");
  }
  return current;
}
```

**Usage examples**:
```typescript
// Example 1: Render a video element for motion blur
const video = document.querySelector('ef-video');
const frames: HTMLCanvasElement[] = [];

// Render at sub-frame intervals
for (let t = 1000; t < 1100; t += 10) {
  const canvas = await renderElementToCanvas(video, {
    timeMs: t,
    scale: 0.5,
  });
  frames.push(canvas);
}

// Composite frames for motion blur
const blurred = applyMotionBlur(frames);

// Example 2: Render HTML content for shader input
const textElement = document.querySelector('.animated-text');
const textCanvas = await renderElementToCanvas(textElement, {
  timeMs: 2000,
  width: 1920,
  height: 1080,
});

// Use as shader texture
applyShaderEffect(textCanvas);

// Example 3: Render standalone element (no timeline)
const div = document.createElement('div');
div.innerHTML = '<h1>Hello World</h1>';
const canvas = await renderElementToCanvas(div, {
  timeMs: 0,  // Ignored for non-timeline elements
  width: 800,
  height: 600,
});
```

**Pros**:
- ✅ **Unified API**: Works for timegroups, temporal elements, and plain DOM
- ✅ **Flexible**: Supports both timeline-aware and static rendering
- ✅ **Reusable**: Core primitive for all rendering needs
- ✅ **Efficient**: Only clones what's needed (root timegroup)
- ✅ **Maintainable**: Single code path, well-tested
- ✅ **Extensible**: Easy to add new options (effects, filters, etc.)

**Cons**:
- ⚠️ Requires element identity tracking (solvable with data-element-id)
- ⚠️ Still creates full root clone (but this is necessary for timeline correctness)

---

## Implementation Plan (Approach 3)

### Phase 1: Core Infrastructure

1. **Element Identity System**
   - Add `data-element-id` to all elements during registration
   - Implement `findCorrespondingElement()` with fallback strategies
   - Test with nested timegroups and complex hierarchies

2. **Extract Serialization Primitive**
   - Refactor `serializeTimelineToXHTML()` to accept any element
   - Create `serializeElementToXHTML()` that works on subtrees
   - Ensure temporal visibility checks work for partial trees

3. **Render Primitive Function**
   - Implement `renderElementToCanvas()` with timeline detection
   - Support both timeline-aware and static paths
   - Add comprehensive options (scale, dimensions, etc.)

### Phase 2: Integration & Testing

4. **Integration with Existing Systems**
   - Update `renderTimegroupToVideo()` to use new primitive
   - Ensure `captureTimegroupAtTime()` still works
   - Verify no performance regressions

5. **Test Coverage**
   - Unit tests for element identity tracking
   - Integration tests for timeline-aware rendering
   - Performance tests for batch operations

### Phase 3: Advanced Features

6. **Motion Blur Support**
   - Helper function for sub-frame sampling
   - Canvas compositing utilities
   - Example implementations

7. **Shader Integration**
   - WebGL texture creation from canvas
   - Shader effect pipeline
   - HTML-to-shader examples

---

## Technical Considerations

### Timeline Seeking

**Challenge**: Elements need to be rendered at the time of their root timegroup.

**Solution**: Always create a render clone of the root timegroup and seek it to the target time. This ensures:
- All animations are at correct state
- All frame tasks have executed
- All media elements are at correct position
- CSS computed styles reflect timeline state

**Why we can't skip this**: Even if we're only rendering one element, that element's visual state depends on:
- Its own animations (controlled by root timeline)
- Parent timegroup animations (opacity, transforms)
- Frame tasks that may modify DOM
- Video/audio elements that need seeking

### Element Identity Tracking

**Challenge**: How to find the same element in a cloned tree?

**Solutions** (in priority order):

1. **data-element-id attribute** (preferred)
   - Set during element registration
   - Persists through cloning
   - Unique and stable

2. **id attribute** (fallback)
   - May not be unique
   - May be used for other purposes
   - But better than nothing

3. **Structural path** (last resort)
   - Index-based traversal
   - Fragile if DOM changes
   - But always works

**Implementation**: Try all three strategies in order.

### Performance Optimization

**Concern**: Creating a full render clone for a single element seems wasteful.

**Reality**: We MUST clone the root timegroup because:
- Timeline seeking affects entire tree
- Can't seek prime timeline (breaks user preview)
- Partial clones break parent-child relationships

**Mitigation**:
- Reuse clone for batch operations (like motion blur)
- Cache render contexts across frames
- Optimize serialization to skip invisible elements

### Render Context Caching

The existing `RenderContext` system provides excellent caching:
- Canvas pixels cached by content hash
- Reused across frames if content unchanged
- Automatic cache eviction

**For element rendering**: Pass a `RenderContext` instance to enable caching across multiple renders.

---

## Use Case Examples

### 1. Motion Blur

```typescript
async function applyMotionBlur(
  element: Element,
  startMs: number,
  endMs: number,
  samples: number
): Promise<HTMLCanvasElement> {
  const frames: HTMLCanvasElement[] = [];
  const step = (endMs - startMs) / samples;
  
  // Render at sub-frame intervals
  for (let i = 0; i < samples; i++) {
    const timeMs = startMs + i * step;
    const canvas = await renderElementToCanvas(element, {
      timeMs,
      scale: 0.5,  // Lower resolution for intermediate frames
    });
    frames.push(canvas);
  }
  
  // Composite with alpha blending
  return compositeFrames(frames, { mode: 'average' });
}
```

### 2. Canvas Effects

```typescript
async function applyGlowEffect(
  element: Element,
  timeMs: number
): Promise<HTMLCanvasElement> {
  // Render element to canvas
  const canvas = await renderElementToCanvas(element, {
    timeMs,
    scale: 1.0,
  });
  
  // Apply WebGL shader
  const glowCanvas = applyShader(canvas, {
    shader: 'glow',
    intensity: 0.8,
    radius: 20,
  });
  
  return glowCanvas;
}
```

### 3. HTML-to-Shader Loop

```typescript
async function renderHTMLToTexture(
  element: Element,
  timeMs: number
): Promise<WebGLTexture> {
  // Render HTML to canvas
  const canvas = await renderElementToCanvas(element, {
    timeMs,
    width: 1024,   // Power-of-2 for WebGL
    height: 1024,
  });
  
  // Upload to WebGL texture
  const gl = getWebGLContext();
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(
    gl.TEXTURE_2D, 
    0, 
    gl.RGBA, 
    gl.RGBA, 
    gl.UNSIGNED_BYTE, 
    canvas
  );
  
  return texture;
}
```

---

## API Design

### Core Function

```typescript
/**
 * Render any element to canvas at a specific time.
 * 
 * Supports both timeline-aware elements (inside timegroups) and
 * static elements (standalone DOM).
 * 
 * For timeline-aware elements:
 * - Creates render clone of root timegroup
 * - Seeks to target time
 * - Renders element in timeline context
 * 
 * For static elements:
 * - Renders current state directly
 * - No timeline seeking
 * 
 * @param element - Element to render (any DOM element)
 * @param options - Render options
 * @returns Canvas with rendered content
 */
export async function renderElementToCanvas(
  element: Element,
  options: RenderElementOptions
): Promise<HTMLCanvasElement>;

export interface RenderElementOptions {
  /** Time to render at (for timeline-aware elements) */
  timeMs: number;
  
  /** Output scale factor (default: 1.0) */
  scale?: number;
  
  /** Output width (default: element.offsetWidth) */
  width?: number;
  
  /** Output height (default: element.offsetHeight) */
  height?: number;
  
  /** Override root timegroup (for testing/advanced use) */
  rootTimegroup?: EFTimegroup;
  
  /** Render context for caching (reuse across calls) */
  renderContext?: RenderContext;
  
  /** Content readiness mode (default: "immediate") */
  contentReadyMode?: ContentReadyMode;
  
  /** Timeout for blocking mode (default: 5000ms) */
  blockingTimeoutMs?: number;
}
```

### Helper Functions

```typescript
/**
 * Render element at multiple times (for motion blur, etc.)
 */
export async function renderElementBatch(
  element: Element,
  timestamps: number[],
  options?: Omit<RenderElementOptions, 'timeMs'>
): Promise<HTMLCanvasElement[]>;

/**
 * Find root timegroup for an element (if any)
 */
export function findRootTimegroup(
  element: Element
): EFTimegroup | undefined;

/**
 * Check if element is timeline-aware
 */
export function isTimelineAware(
  element: Element
): boolean;
```

---

## Comparison with Existing System

### Current: `renderTimegroupToVideo()`

```typescript
// Can only render entire timegroups
await timegroup.renderToVideo({
  fps: 30,
  codec: 'avc',
});
```

### Proposed: `renderElementToCanvas()`

```typescript
// Can render any element
const canvas = await renderElementToCanvas(element, {
  timeMs: 1000,
  scale: 1.0,
});

// Timegroups still work
const canvas = await renderElementToCanvas(timegroup, {
  timeMs: 1000,
  scale: 1.0,
});

// Non-temporal elements work too
const div = document.createElement('div');
const canvas = await renderElementToCanvas(div, {
  timeMs: 0,  // Ignored
  width: 800,
  height: 600,
});
```

---

## Migration Path

### Phase 1: Add New API (No Breaking Changes)

- Implement `renderElementToCanvas()` as new export
- Keep existing `renderTimegroupToVideo()` unchanged
- Both systems coexist

### Phase 2: Internal Refactoring

- Update `renderTimegroupToVideo()` to use new primitive internally
- Ensure no behavior changes
- Comprehensive testing

### Phase 3: Deprecation (Optional, Future)

- Mark old APIs as deprecated if desired
- Provide migration guide
- Remove in next major version

---

## Risks & Mitigations

### Risk 1: Element Identity Tracking Fails

**Scenario**: Can't find element in clone tree.

**Mitigation**:
- Use multiple fallback strategies (id, data-element-id, path)
- Add explicit error messages with debugging info
- Provide manual override option

### Risk 2: Performance Regression

**Scenario**: Creating full clone for single element is slow.

**Mitigation**:
- Profile and optimize clone creation
- Reuse clones for batch operations
- Document best practices for performance

### Risk 3: Timeline State Inconsistency

**Scenario**: Element renders at wrong time or with wrong state.

**Mitigation**:
- Comprehensive integration tests
- Verify seekForRender() behavior
- Test with nested timegroups and complex animations

---

## Conclusion

**Recommendation**: Implement **Approach 3 (Unified Render Primitive)**.

**Why**:
1. **Flexible**: Works for timegroups, temporal elements, and plain DOM
2. **Maintainable**: Single code path, well-tested
3. **Extensible**: Easy to add new features (effects, filters)
4. **Efficient**: Reuses existing infrastructure (cloning, serialization, caching)
5. **Safe**: No breaking changes to existing APIs

**Next Steps**:
1. Implement element identity system
2. Extract serialization primitive
3. Build `renderElementToCanvas()` function
4. Add comprehensive tests
5. Document usage patterns

**Timeline Estimate**:
- Phase 1 (Core): 1-2 weeks
- Phase 2 (Integration): 1 week
- Phase 3 (Advanced): 2-3 weeks

**Total**: 4-6 weeks for full implementation and testing.
