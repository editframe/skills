---
description: "Picture-in-Picture toggle button that floats a video or canvas composition in the browser's native PiP window."
---


# ef-pip

## Attributes

- **target** (string) - ID of a `<video>`, `<canvas>`, or container element to use for PiP

## Slots

- **enter** - Content shown when not in PiP mode
- **exit** - Content shown when in PiP mode

# PIP

Button that requests or exits Picture-in-Picture mode for a video or canvas.

## Import

```tsx
import { PIP } from "@editframe/react";
```

## Basic Usage

```html live
<ef-timegroup id="pip-demo" mode="fixed" duration="5s" loop class="w-[1920px] h-[1080px] bg-slate-900 flex items-center justify-center">
  <ef-text class="text-white text-7xl font-bold">Hello</ef-text>
</ef-timegroup>

<ef-pip target="pip-demo" class="p-4">
  <button slot="enter" class="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700">⧉ Picture in Picture</button>
  <button slot="exit" class="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700">✕ Exit PiP</button>
</ef-pip>
```
```tsx
import { PIP } from "@editframe/react";

export const App = () => (
  <PIP target="my-composition" className="p-4">
    <button slot="enter" className="px-4 py-2 bg-gray-800 text-white rounded">⧉ PiP</button>
    <button slot="exit" className="px-4 py-2 bg-gray-800 text-white rounded">✕ Exit PiP</button>
  </PIP>
);
```

## Targeting Different Element Types

`ef-pip` accepts three kinds of targets:

**Native `<video>` element** — PiP is requested directly:

```html
<video id="my-video" src="video.mp4"></video>
<ef-pip target="my-video">
  <button slot="enter">PiP</button>
  <button slot="exit">Exit</button>
</ef-pip>
```

**`<canvas>` element** — a hidden capture video is created via `captureStream()`:

```html
<canvas id="my-canvas"></canvas>
<ef-pip target="my-canvas">
  <button slot="enter">PiP</button>
  <button slot="exit">Exit</button>
</ef-pip>
```

**Container element (e.g. `ef-timegroup`)** — the first `<video>` or `<canvas>` descendant is used automatically:

```html
<ef-timegroup id="my-comp" mode="fixed" duration="5s">
  <ef-video src="video.mp4" class="size-full"></ef-video>
</ef-timegroup>
<ef-pip target="my-comp">
  <button slot="enter">PiP</button>
  <button slot="exit">Exit</button>
</ef-pip>
```

## Notes

- Requires a user gesture (click) to activate.
- Availability depends on browser support for the [Picture-in-Picture API](https://developer.mozilla.org/en-US/docs/Web/API/Picture-in-Picture_API).
- The capture video created for canvas targets is hidden (`position:absolute; opacity:0`) and cleaned up when `ef-pip` is disconnected.
