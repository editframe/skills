---
description: "Toggle button that mutes and unmutes playback audio, with slot-based content for each state."
---


# ef-mute

## Attributes

- **target** (string) - ID of the element to control (optional if nested in `ef-controls`)

## Slots

- **unmuted** - Content shown when audio is not muted
- **muted** - Content shown when audio is muted

# Mute

Toggle button for muting and unmuting playback audio.

## Import

```tsx
import { Mute } from "@editframe/react";
```

## Basic Usage

```html live
<ef-timegroup id="mute-demo" mode="fixed" duration="5s" loop class="w-[1920px] h-[1080px] bg-slate-900 flex items-center justify-center">
  <ef-text class="text-white text-7xl font-bold">Hello</ef-text>
</ef-timegroup>

<ef-controls target="mute-demo">
  <ef-mute class="p-4">
    <button slot="unmuted" class="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700">🔊 Mute</button>
    <button slot="muted" class="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700">🔇 Unmute</button>
  </ef-mute>
</ef-controls>
```
```tsx
import { Controls, Mute } from "@editframe/react";

export const App = () => (
  <Controls target="my-composition">
    <Mute className="p-4">
      <button slot="unmuted" className="px-4 py-2 bg-gray-800 text-white rounded">🔊 Mute</button>
      <button slot="muted" className="px-4 py-2 bg-gray-800 text-white rounded">🔇 Unmute</button>
    </Mute>
  </Controls>
);
```

## With ef-volume

Pair with `ef-volume` for a complete audio control bar:

```html live
<ef-timegroup id="audio-ctrl-demo" mode="fixed" duration="5s" loop class="w-[1920px] h-[1080px] bg-slate-900 flex items-center justify-center">
  <ef-text class="text-white text-7xl font-bold">Hello</ef-text>
</ef-timegroup>

<ef-controls target="audio-ctrl-demo">
  <div class="flex items-center gap-3 p-4">
    <ef-mute>
      <button slot="unmuted" class="w-8 h-8 flex items-center justify-center bg-gray-800 text-white rounded hover:bg-gray-700">🔊</button>
      <button slot="muted" class="w-8 h-8 flex items-center justify-center bg-gray-800 text-white rounded hover:bg-gray-700">🔇</button>
    </ef-mute>
    <ef-volume style="flex:1;max-width:200px;accent-color:white"></ef-volume>
  </div>
</ef-controls>
```

## Target Attribute

Directly target an element without `ef-controls`:

```html
<ef-mute target="my-video">
  <button slot="unmuted">🔊</button>
  <button slot="muted">🔇</button>
</ef-mute>
```
