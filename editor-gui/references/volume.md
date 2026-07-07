---
description: "Range slider that controls playback volume (0–1), auto-unmuting when raised above zero while muted."
---


# ef-volume

## Attributes

- **target** (string) - ID of the element to control (optional if nested in `ef-controls`)

# Volume

Range slider for controlling playback volume. Raises audio from 0 to 1 and automatically unmutes when the user raises the slider while muted.

## Import

```tsx
import { Volume } from "@editframe/react";
```

## Basic Usage

```html live
<ef-timegroup id="vol-demo" mode="fixed" duration="5s" loop class="w-[1920px] h-[1080px] bg-slate-900 flex items-center justify-center">
  <ef-text class="text-white text-7xl font-bold">Hello</ef-text>
</ef-timegroup>

<ef-controls target="vol-demo">
  <div class="flex items-center gap-3 p-4">
    <ef-mute>
      <button slot="unmuted" class="px-3 py-1.5 bg-gray-800 text-white rounded text-sm hover:bg-gray-700">🔊</button>
      <button slot="muted" class="px-3 py-1.5 bg-gray-800 text-white rounded text-sm hover:bg-gray-700">🔇</button>
    </ef-mute>
    <ef-volume style="flex:1;max-width:200px;accent-color:white"></ef-volume>
  </div>
</ef-controls>
```
```tsx
import { Controls, Volume, Mute } from "@editframe/react";

export const App = () => (
  <Controls target="my-composition">
    <div className="flex items-center gap-3 p-4">
      <Mute>
        <button slot="unmuted">🔊</button>
        <button slot="muted">🔇</button>
      </Mute>
      <Volume style={{ flex: 1, maxWidth: 200, accentColor: "white" }} />
    </div>
  </Controls>
);
```

## With ef-controls

Inside `ef-controls`, volume and mute share context automatically — no `target` needed:

```html
<ef-controls target="my-video">
  <ef-volume></ef-volume>
  <ef-mute>
    <button slot="unmuted">🔊 Mute</button>
    <button slot="muted">🔇 Unmute</button>
  </ef-mute>
</ef-controls>
```

## Auto-Unmute

When the user drags the volume slider up from zero while the composition is muted, `ef-volume` automatically clears the muted state so the audio is audible.

## CSS Custom Properties

Style the track without touching shadow DOM:

| Property | Default | Description |
|----------|---------|-------------|
| `--ef-volume-height` | `4px` | Track and thumb height |
| `--ef-volume-track-color` | `rgba(255,255,255,0.2)` | Unfilled track color |
| `--ef-volume-fill-color` | `white` | Filled (progress) track color |

```html
<ef-volume style="
  --ef-volume-height: 3px;
  --ef-volume-track-color: rgba(255,255,255,0.15);
  --ef-volume-fill-color: #e53935;
"></ef-volume>
```

```tsx
<Volume
  className="w-16"
  style={{
    "--ef-volume-height": "3px",
    "--ef-volume-track-color": "rgba(255,255,255,0.15)",
    "--ef-volume-fill-color": "var(--brand-red)",
  } as React.CSSProperties}
/>
```

## Target Attribute

Target an element directly without `ef-controls`:

```html
<ef-volume target="my-video"></ef-volume>
```
