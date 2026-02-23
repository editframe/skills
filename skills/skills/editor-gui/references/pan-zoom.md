---
title: Pan-Zoom Element
description: Interactive container providing pan and zoom navigation with touch gesture support, mouse wheel zoom, and programmatic control.
type: reference
nav:
  parent: "Preview & Canvas"
  priority: 12
api:
  attributes:
    - name: x
      type: number
      default: 0
      description: Horizontal pan offset in pixels
    - name: y
      type: number
      default: 0
      description: Vertical pan offset in pixels
    - name: scale
      type: number
      default: 1
      description: Zoom scale factor (0.1 to 5)
    - name: auto-fit
      type: boolean
      default: false
      description: Auto-fit content on first render
  methods:
    - name: screenToCanvas(screenX, screenY)
      signature: "screenToCanvas(screenX: number, screenY: number): { x: number, y: number }"
      description: Convert screen coordinates to canvas coordinates
      returns: Object with x, y in canvas space
    - name: canvasToScreen(canvasX, canvasY)
      signature: "canvasToScreen(canvasX: number, canvasY: number): { x: number, y: number }"
      description: Convert canvas coordinates to screen coordinates
      returns: Object with x, y in screen space
    - name: reset()
      signature: "reset(): void"
      description: Reset to default transform (x=0, y=0, scale=1)
      returns: void
    - name: fitToContent(padding)
      signature: "fitToContent(padding?: number): void"
      description: Fit content to container with optional padding (0-1)
      returns: void
  events:
    - name: transform-changed
      type: CustomEvent<PanZoomTransform>
      description: Fired when pan or zoom changes
      detail: "{ x: number, y: number, scale: number }"
react:
  generate: true
  componentName: PanZoom
  importPath: "@editframe/react"
  propMapping:
    auto-fit: autoFit
  additionalProps:
    - name: onTransformChanged
      type: "(event: CustomEvent<PanZoomTransform>) => void"
      description: Callback fired when pan or zoom changes
    - name: className
      type: string
      description: CSS classes for styling
    - name: children
      type: ReactNode
      description: Content to make pannable and zoomable
    - name: ref
      type: "Ref<EFPanZoom>"
      description: Ref to access underlying element methods
  nav:
    parent: "Components / Interaction"
    priority: 15
    related: ["preview", "workbench"]
---

<!-- html-only -->
# ef-pan-zoom
<!-- /html-only -->
<!-- react-only -->
# PanZoom
<!-- /react-only -->

Interactive pan and zoom container with mouse/trackpad gesture support.

<!-- react-only -->
## Import

```tsx
import { PanZoom } from "@editframe/react";
```
<!-- /react-only -->

## Basic Usage

Wrap any content to make it pannable and zoomable:

<!-- html-only -->
```html live
<ef-pan-zoom class="w-[720px] h-[480px] border border-gray-300 rounded">
  <ef-timegroup mode="contain" class="w-[1280px] h-[720px] bg-black">
    <ef-video src="https://assets.editframe.com/bars-n-tone.mp4" class="size-full object-contain"></ef-video>
  </ef-timegroup>
</ef-pan-zoom>
```

> **Interaction:** Click and drag to pan. Hold Cmd/Ctrl and scroll to zoom. Scroll to pan horizontally/vertically.
<!-- /html-only -->
<!-- react-only -->
```tsx
import { PanZoom, Timegroup, Video } from "@editframe/react";

<PanZoom className="w-[720px] h-[480px] border border-gray-300 rounded">
  <Timegroup mode="contain" className="w-[1280px] h-[720px] bg-black">
    <Video src="/assets/video.mp4" className="size-full object-contain" />
  </Timegroup>
</PanZoom>
```

**Interaction:**
- Click and drag to pan
- Cmd/Ctrl + scroll to zoom
- Two-finger trackpad gestures for pan/zoom
<!-- /react-only -->

## Auto-Fit Content

Automatically fit content to the container on load:

<!-- html-only -->
```html live
<ef-pan-zoom auto-fit class="w-[600px] h-[400px] border border-gray-300 rounded bg-gray-50">
  <ef-timegroup mode="contain" class="w-[1280px] h-[720px] bg-black">
    <ef-video src="https://assets.editframe.com/bars-n-tone.mp4" class="size-full object-contain"></ef-video>
  </ef-timegroup>
</ef-pan-zoom>
```

The `auto-fit` attribute centers and scales content to fit with 5% padding.
<!-- /html-only -->
<!-- react-only -->
```tsx
<PanZoom
  autoFit
  className="w-[600px] h-[400px] border border-gray-300 rounded bg-gray-50"
>
  <Timegroup mode="contain" className="w-[1280px] h-[720px] bg-black">
    <Video src="/assets/video.mp4" className="size-full object-contain" />
  </Timegroup>
</PanZoom>
```

The `autoFit` prop centers and scales content to fit with 5% padding.
<!-- /react-only -->

## Gesture Controls

### Panning

<!-- html-only -->
Click and drag anywhere to pan the view:

```html live
<ef-pan-zoom class="w-[500px] h-[300px] border border-gray-300 rounded">
  <div class="w-[1000px] h-[600px] bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
    <p class="text-white text-2xl font-bold">Drag to pan</p>
  </div>
</ef-pan-zoom>
```

### Zooming

Hold Cmd (Mac) or Ctrl (Windows/Linux) and scroll to zoom:

```html live
<ef-pan-zoom class="w-[500px] h-[300px] border border-gray-300 rounded">
  <div class="w-[800px] h-[600px] bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center">
    <p class="text-white text-2xl font-bold">Cmd/Ctrl + Scroll to zoom</p>
  </div>
</ef-pan-zoom>
```

Zoom is centered on the cursor position — the point under the cursor remains fixed while zooming.

### Trackpad Gestures

- **Two-finger drag:** Pan horizontally and vertically
- **Pinch:** Zoom in/out (with Cmd/Ctrl)
- **Scroll:** Pan without modifier keys
<!-- /html-only -->
<!-- react-only -->
- **Click and drag:** Pan in any direction
- **Two-finger drag (trackpad):** Pan horizontally and vertically
- **Scroll:** Pan without modifier keys

### Zooming
- **Cmd/Ctrl + scroll:** Zoom in/out
- **Pinch (trackpad):** Zoom with Cmd/Ctrl modifier

Zoom is centered on the cursor position — the point under the cursor remains fixed while zooming.
<!-- /react-only -->

## Programmatic Control

<!-- html-only -->
Set transform properties directly:

```html live
<div>
  <ef-pan-zoom id="demo-panzoom" x="100" y="50" scale="1.5" class="w-[500px] h-[300px] border border-gray-300 rounded">
    <div class="w-[800px] h-[600px] bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center">
      <p class="text-white text-2xl font-bold">Programmatic Transform</p>
    </div>
  </ef-pan-zoom>
  <div class="mt-4 flex gap-2">
    <button onclick="document.getElementById('demo-panzoom').reset()" class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">Reset</button>
    <button onclick="document.getElementById('demo-panzoom').fitToContent()" class="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600">Fit Content</button>
    <button onclick="document.getElementById('demo-panzoom').scale = 2" class="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600">Zoom 2x</button>
  </div>
</div>
```
<!-- /html-only -->
<!-- react-only -->
Control transform with props:

```tsx
import { useState } from "react";
import { PanZoom, Timegroup, Video } from "@editframe/react";

const ZoomablePreview = () => {
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [scale, setScale] = useState(1);

  return (
    <div>
      <PanZoom
        x={x}
        y={y}
        scale={scale}
        className="w-[500px] h-[300px] border border-gray-300 rounded"
      >
        <Timegroup mode="contain" className="w-[800px] h-[600px] bg-black">
          <Video src="/assets/video.mp4" className="size-full" />
        </Timegroup>
      </PanZoom>

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => { setX(0); setY(0); setScale(1); }}
          className="px-3 py-1 bg-blue-500 text-white rounded"
        >
          Reset
        </button>
        <button
          onClick={() => setScale(2)}
          className="px-3 py-1 bg-purple-500 text-white rounded"
        >
          Zoom 2x
        </button>
        <button
          onClick={() => setScale(0.5)}
          className="px-3 py-1 bg-green-500 text-white rounded"
        >
          Zoom Out
        </button>
      </div>
    </div>
  );
};
```
<!-- /react-only -->

## Methods

### reset()

Reset the view to default values:

<!-- html-only -->
```javascript
const panZoom = document.querySelector('ef-pan-zoom');
panZoom.reset(); // x=0, y=0, scale=1
```
<!-- /html-only -->
<!-- react-only -->
```tsx
import { useRef } from "react";
import { PanZoom } from "@editframe/react";
import type { EFPanZoom } from "@editframe/elements";

const panZoomRef = useRef<EFPanZoom>(null);
panZoomRef.current?.reset();
```
<!-- /react-only -->

### fitToContent(padding)

Fit content to the container:

<!-- html-only -->
```javascript
const panZoom = document.querySelector('ef-pan-zoom');
panZoom.fitToContent(0.1); // 10% padding on each side
```
<!-- /html-only -->
<!-- react-only -->
```tsx
panZoomRef.current?.fitToContent(0.1); // 10% padding
```
<!-- /react-only -->

Padding is a factor from 0 to 1, where 0.1 = 10% padding.

### screenToCanvas(screenX, screenY)

Convert screen coordinates (e.g., mouse event) to canvas coordinates:

<!-- html-only -->
```javascript
panZoom.addEventListener('click', (e) => {
  const canvasPos = panZoom.screenToCanvas(e.clientX, e.clientY);
  console.log(`Clicked at canvas position: ${canvasPos.x}, ${canvasPos.y}`);
});
```
<!-- /html-only -->
<!-- react-only -->
```tsx
const canvasPos = panZoomRef.current?.screenToCanvas(e.clientX, e.clientY);
```
<!-- /react-only -->

Useful for hit detection and positioning elements in canvas space.

### canvasToScreen(canvasX, canvasY)

Convert canvas coordinates to screen coordinates:

<!-- html-only -->
```javascript
const screenPos = panZoom.canvasToScreen(element.x, element.y);
tooltip.style.left = `${screenPos.x}px`;
tooltip.style.top = `${screenPos.y}px`;
```
<!-- /html-only -->
<!-- react-only -->
```tsx
const screenPos = panZoomRef.current?.canvasToScreen(canvasX, canvasY);
```
<!-- /react-only -->

Useful for positioning overlays and tooltips relative to canvas elements.

## Events

### transform-changed

Fired when pan or zoom changes:

<!-- html-only -->
```javascript
panZoom.addEventListener('transform-changed', (e) => {
  console.log('Transform:', e.detail); // { x, y, scale }
});
```

Use this to sync UI controls or persist view state.
<!-- /html-only -->
<!-- react-only -->
```tsx
<PanZoom
  onTransformChanged={(e) => {
    console.log('Transform:', e.detail); // { x, y, scale }
  }}
  className="w-[500px] h-[300px]"
>
  <div className="w-[1000px] h-[600px] bg-gradient-to-br from-blue-500 to-purple-600">
    <p className="text-white text-2xl">Pan and zoom me</p>
  </div>
</PanZoom>
```
<!-- /react-only -->

<!-- html-only -->
## Context Provision

`ef-pan-zoom` provides transform data via Lit context. Child components can consume this to render overlays that match the transform:

```javascript
import { consume } from '@lit/context';
import { panZoomTransformContext } from '@editframe/elements';

@consume({ context: panZoomTransformContext })
panZoomTransform?: PanZoomTransform;
```

Overlay components (like selection handles) use this to align with the panned/zoomed content.
<!-- /html-only -->

<!-- react-only -->
## With Ref for Methods

Access underlying element methods using ref:

```tsx
import { useRef } from "react";
import { PanZoom } from "@editframe/react";
import type { EFPanZoom } from "@editframe/elements";

const PanZoomWithControls = () => {
  const panZoomRef = useRef<EFPanZoom>(null);

  const handleReset = () => {
    panZoomRef.current?.reset();
  };

  const handleFitContent = () => {
    panZoomRef.current?.fitToContent(0.1); // 10% padding
  };

  return (
    <div>
      <PanZoom ref={panZoomRef} className="w-[500px] h-[300px] border">
        {/* Content */}
      </PanZoom>

      <div className="flex gap-2 mt-2">
        <button onClick={handleReset}>Reset</button>
        <button onClick={handleFitContent}>Fit Content</button>
      </div>
    </div>
  );
};
```

### Available Methods

- `reset()` - Reset to default transform (x=0, y=0, scale=1)
- `fitToContent(padding?: number)` - Fit content to container with optional padding (0-1)
- `screenToCanvas(screenX: number, screenY: number)` - Convert screen coordinates to canvas coordinates
- `canvasToScreen(canvasX: number, canvasY: number)` - Convert canvas coordinates to screen coordinates

## With usePanZoomTransform Hook

Use the `usePanZoomTransform` hook to access transform data in child components:

```tsx
import { PanZoom, usePanZoomTransform } from "@editframe/react";

const TransformDisplay = () => {
  const transform = usePanZoomTransform();

  return (
    <div className="absolute top-4 right-4 bg-white/90 px-3 py-2 rounded text-sm">
      <div>X: {transform?.x.toFixed(0)}</div>
      <div>Y: {transform?.y.toFixed(0)}</div>
      <div>Scale: {transform?.scale.toFixed(2)}</div>
    </div>
  );
};

export const PanZoomWithDisplay = () => {
  return (
    <PanZoom className="w-[500px] h-[300px] border rounded">
      <div className="w-[1000px] h-[600px] bg-blue-500">
        <TransformDisplay />
      </div>
    </PanZoom>
  );
};
```
<!-- /react-only -->

## Video Preview with Pan-Zoom

Create a zoomable video preview:

<!-- html-only -->
```html live
<ef-pan-zoom auto-fit class="w-[720px] h-[480px] border border-gray-300 rounded bg-gray-900">
  <ef-timegroup mode="contain" class="w-[1920px] h-[1080px] bg-black">
    <ef-video src="https://assets.editframe.com/bars-n-tone.mp4" class="size-full object-contain"></ef-video>
    <div class="absolute top-8 left-8 bg-white/90 backdrop-blur px-4 py-2 rounded">
      <p class="text-sm font-semibold">Zoomable Preview</p>
      <p class="text-xs text-gray-600">Cmd/Ctrl + Scroll to zoom</p>
    </div>
  </ef-timegroup>
</ef-pan-zoom>
```
<!-- /html-only -->
<!-- react-only -->
```tsx
import { PanZoom, Timegroup, Video, Text } from "@editframe/react";

export const VideoEditorPreview = () => {
  return (
    <div className="flex flex-col gap-4">
      <PanZoom
        autoFit
        className="w-full h-[600px] border border-gray-300 rounded bg-gray-900"
      >
        <Timegroup mode="contain" className="w-[1920px] h-[1080px] bg-black">
          <Video
            src="/assets/project.mp4"
            className="size-full object-contain"
          />
          <Text className="absolute top-8 left-8 text-white text-4xl">
            Zoomable Preview
          </Text>
        </Timegroup>
      </PanZoom>

      <div className="text-sm text-gray-600">
        Cmd/Ctrl + Scroll to zoom • Click and drag to pan
      </div>
    </div>
  );
};
```
<!-- /react-only -->

## Styling

<!-- html-only -->
The element has `overflow: hidden` and `position: relative` by default. Style the container as needed:

```html
<ef-pan-zoom class="w-full h-screen border-2 border-blue-500 rounded-lg shadow-xl">
  <!-- Content -->
</ef-pan-zoom>
```
<!-- /html-only -->
<!-- react-only -->
The component has `overflow: hidden` and `position: relative` by default. Add custom styles via `className`:

```tsx
<PanZoom className="w-full h-screen border-2 border-blue-500 rounded-lg shadow-xl">
  {/* Content */}
</PanZoom>
```
<!-- /react-only -->

## Scale Limits

Scale is clamped between 0.1 and 5:
- Minimum: 0.1 (10% of original size)
- Maximum: 5 (500% of original size)

These limits prevent unusable zoom levels while allowing meaningful magnification.

<!-- html-only -->
## Browser Navigation Prevention

`ef-pan-zoom` prevents browser back/forward navigation triggered by trackpad swipes. This ensures pan gestures don't accidentally navigate away from the page.

The element uses passive event listeners in capture phase to intercept and prevent default navigation behavior while still allowing normal pan/zoom interactions.
<!-- /html-only -->

<!-- react-only -->
## TypeScript Types

```tsx
import type { PanZoomTransform } from "@editframe/elements";

// Transform structure
interface PanZoomTransform {
  x: number;
  y: number;
  scale: number;
}
```
<!-- /react-only -->
