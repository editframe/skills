---
description: "Toggle button that enters or exits browser fullscreen mode on a target element, with enter and exit slot content."
---


# ef-fullscreen

## Attributes

- **target** (string) - ID of the element to make fullscreen (defaults to `document.documentElement`)

## Slots

- **enter** - Content shown when not in fullscreen
- **exit** - Content shown when in fullscreen

# Fullscreen

Button that toggles browser fullscreen mode on a target element.

## Import

```tsx
import { Fullscreen } from "@editframe/react";
```

## Basic Usage

```html live
<ef-timegroup id="fs-demo" mode="fixed" duration="5s" loop class="w-[1920px] h-[1080px] bg-slate-900 flex items-center justify-center">
  <ef-text class="text-white text-7xl font-bold">Hello</ef-text>
</ef-timegroup>

<ef-fullscreen target="fs-demo" class="p-4">
  <button slot="enter" class="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700">⛶ Fullscreen</button>
  <button slot="exit" class="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700">✕ Exit</button>
</ef-fullscreen>
```
```tsx
import { Fullscreen } from "@editframe/react";

export const App = () => (
  <Fullscreen target="my-composition" className="p-4">
    <button slot="enter" className="px-4 py-2 bg-gray-800 text-white rounded">⛶ Fullscreen</button>
    <button slot="exit" className="px-4 py-2 bg-gray-800 text-white rounded">✕ Exit</button>
  </Fullscreen>
);
```

## Inside a Player Bar

Use inside `ef-controls` or standalone next to a composition:

```html
<ef-timegroup id="my-video" mode="fixed" duration="10s">
  <ef-video src="video.mp4" class="size-full"></ef-video>
</ef-timegroup>

<div class="flex items-center gap-2 p-2 bg-gray-900">
  <ef-controls target="my-video">
    <ef-toggle-play>
      <button slot="play">▶</button>
      <button slot="pause">⏸</button>
    </ef-toggle-play>
    <ef-scrubber class="flex-1"></ef-scrubber>
  </ef-controls>
  <ef-fullscreen target="my-video">
    <button slot="enter">⛶</button>
    <button slot="exit">✕</button>
  </ef-fullscreen>
</div>
```

## Fullscreening the Page

Omit `target` to fullscreen the entire page (`document.documentElement`):

```html
<ef-fullscreen>
  <button slot="enter">Enter fullscreen</button>
  <button slot="exit">Exit fullscreen</button>
</ef-fullscreen>
```

## Notes

- Uses the browser [Fullscreen API](https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API); requires a user gesture to activate.
- Listens to `fullscreenchange` events so the slot stays in sync when the user presses Escape.
