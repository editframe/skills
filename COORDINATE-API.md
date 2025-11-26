# Declarative Coordinate API for PanZoom

## Overview

End users should **never have to think about coordinate space transformations**. This document describes the clean API that abstracts away all pan/zoom math.

## Problem

Previously, to handle mouse events or place elements on a pan/zoom canvas, developers had to:
1. Get the container's bounding rect
2. Subtract the container offset from the mouse position
3. Subtract the pan offset
4. Divide by the scale

This was error-prone, repetitive, and leaked implementation details into application code.

## Solution

`EFPanZoom` now provides two methods that handle **all** coordinate transformations:

### `screenToCanvas(screenX, screenY)`

Convert screen coordinates (e.g., mouse event `clientX`/`clientY`) to canvas coordinates.

**Example:**
```typescript
const handleClick = (e: MouseEvent) => {
  const canvasPos = panZoom.screenToCanvas(e.clientX, e.clientY);
  console.log(`Clicked at canvas position: ${canvasPos.x}, ${canvasPos.y}`);
  // No manual math needed!
};
```

### `canvasToScreen(canvasX, canvasY)`

Convert canvas coordinates to screen coordinates. Useful for positioning overlays or tooltips.

**Example:**
```typescript
const screenPos = panZoom.canvasToScreen(element.x, element.y);
tooltip.style.left = `${screenPos.x}px`;
tooltip.style.top = `${screenPos.y}px`;
```

## Implementation Details

Both methods handle:
- Container offset (from `getBoundingClientRect()`)
- Pan offset (`x`, `y` properties)
- Scale factor (`scale` property)

The methods are inverses of each other:
```typescript
const original = { x: 100, y: 200 };
const canvas = panZoom.screenToCanvas(original.x, original.y);
const backToScreen = panZoom.canvasToScreen(canvas.x, canvas.y);
// backToScreen ≈ original (within floating point precision)
```

## Architecture Benefits

### Before

**Canvas.tsx** (React layer):
```typescript
// Manual coordinate transformation 😞
const rect = containerRef.current?.getBoundingClientRect();
const transform = getPanZoomTransform();
const canvasX = (e.clientX - rect.left - transform.x) / transform.scale;
const canvasY = (e.clientY - rect.top - transform.y) / transform.scale;
```

### After

**Canvas.tsx** (React layer):
```typescript
// Declarative coordinate conversion 🎉
const canvasPos = panZoomRef.current.screenToCanvas(e.clientX, e.clientY);
```

### Single Source of Truth

- **Before**: React component maintained its own `panZoomTransform` state → duplication, lag, synchronization bugs
- **After**: `EFPanZoom` is the **only** source of truth for transform state
- React components **never** access `x`, `y`, or `scale` directly
- All coordinate conversions go through the declarative API

## Testing

See `elements/packages/elements/src/elements/EFPanZoom.browsertest.ts` for comprehensive tests covering:
- No pan, no zoom (identity transform)
- Pan only
- Zoom only
- Combined pan and zoom
- Round-trip conversion (screen → canvas → screen)

## Related Components

- `EFOverlayLayer`: Discovers `PanZoom` via Lit context or DOM query, updates on every frame
- `EFOverlayItem`: Tracks target elements and positions itself as an overlay
- No React coordination needed - Lit elements coordinate directly via context and RAF loops

## Design Principle

**End users should never have to do coordinate transformations.** It's domain-irrelevant boilerplate that should be abstracted away by the framework.


