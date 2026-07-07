---
description: "Preset dropdown and custom dimension inputs that set the output width and height of a target timegroup."
---


# ef-resolution

## Attributes

- **target** (string) (required) - ID of the element whose dimensions to control
- **width** (number) - Current width in pixels
- **height** (number) - Current height in pixels

## Events

- **resolution-change** — Fires when the resolution changes. `event.detail: { width: number, height: number }`

# Resolution

Dropdown with preset aspect ratios and custom width/height inputs for controlling a composition's output dimensions.

## Import

```tsx
import { Resolution } from "@editframe/react";
```

## Basic Usage

```html live
<ef-timegroup id="res-demo" mode="fixed" duration="5s" loop class="bg-slate-900 flex items-center justify-center">
  <ef-text class="text-white text-7xl font-bold">Hello</ef-text>
</ef-timegroup>

<ef-resolution target="res-demo" class="p-4"></ef-resolution>
```
```tsx
import { Resolution } from "@editframe/react";

export const App = () => (
  <Resolution
    target="my-composition"
    className="p-4"
    onResolutionChange={(e) => console.log(e.detail)}
  />
);
```

## Built-in Presets

| Label | Width | Height | Ratio |
|-------|-------|--------|-------|
| 1920×1080 (16:9) | 1920 | 1080 | Landscape |
| 1080×1920 (9:16) | 1080 | 1920 | Portrait |
| 1080×1080 (1:1) | 1080 | 1080 | Square |
| 1280×720 (720p) | 1280 | 720 | Landscape |
| 854×480 (480p) | 854 | 480 | Landscape |
| Custom | — | — | User-defined |

## Custom Dimensions

When "Custom" is selected, width and height number inputs are shown. Entering values updates the target element's inline `width` and `height` CSS and fires `resolution-change`.

## How It Works

`ef-resolution` sets `width` and `height` as inline CSS properties on the target element:

```js
target.style.width = `${width}px`;
target.style.height = `${height}px`;
```

This works seamlessly with `ef-timegroup` since the element uses its CSS `width` and `height` to determine its composition dimensions.

## Listening to Changes

```html
<ef-resolution target="my-comp" id="res-ctrl"></ef-resolution>

<script>
  document.getElementById("res-ctrl").addEventListener("resolution-change", (e) => {
    console.log(`New size: ${e.detail.width}x${e.detail.height}`);
  });
</script>
```
