---
title: Play Button Element
description: Play button that auto-hides when playing
type: reference
nav:
  parent: "Playback Controls"
  priority: 11
api:
  attributes:
    - name: target
      type: string
      description: ID of the element to control (optional if nested in composition)
react:
  generate: true
  componentName: Play
  importPath: "@editframe/react"
  additionalProps:
    - name: className
      type: string
      description: CSS classes for styling
    - name: children
      type: ReactNode
      description: Content to display as the play button
  nav:
    parent: "Components / Playback Controls"
    priority: 50
    related: ["pause", "toggle-play", "controls"]
---

<!-- html-only -->
# ef-play
<!-- /html-only -->
<!-- react-only -->
# Play
<!-- /react-only -->

Play button that automatically hides when playback starts.

<!-- react-only -->
## Import

```tsx
import { Play } from "@editframe/react";
```
<!-- /react-only -->

## Basic Usage

<!-- html-only -->
```html live
<ef-timegroup mode="contain" class="w-[720px] h-[480px] bg-black relative">
  <ef-video src="https://assets.editframe.com/bars-n-tone.mp4" class="size-full object-contain"></ef-video>

  <ef-play class="absolute inset-0 flex items-center justify-center">
    <button class="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8 5v14l11-7z"/>
      </svg>
    </button>
  </ef-play>
</ef-timegroup>
```
<!-- /html-only -->
<!-- react-only -->
```tsx
import { Play, Timegroup, Video } from "@editframe/react";

<Timegroup mode="contain" className="w-[720px] h-[480px] bg-black relative">
  <Video src="/assets/video.mp4" className="size-full object-contain" />

  <Play className="absolute inset-0 flex items-center justify-center">
    <button className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8 5v14l11-7z"/>
      </svg>
    </button>
  </Play>
</Timegroup>
```
<!-- /react-only -->

## Auto-Hide Behavior

The play button automatically sets `display: none` when playback starts. It becomes visible again when paused.

<!-- react-only -->
This allows you to create a centered play overlay that disappears during playback without managing state manually.
<!-- /react-only -->

## Custom Slot Content

Slot any content as the play button:

<!-- html-only -->
```html live
<ef-timegroup mode="contain" class="w-[720px] h-[480px] bg-black relative">
  <ef-video src="https://assets.editframe.com/bars-n-tone.mp4" class="size-full object-contain"></ef-video>

  <ef-play class="absolute bottom-4 left-4">
    <button class="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700">
      ▶ Start Video
    </button>
  </ef-play>
</ef-timegroup>
```
<!-- /html-only -->
<!-- react-only -->
```tsx
<Play className="absolute bottom-4 left-4">
  <button className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700">
    ▶ Start Video
  </button>
</Play>
```
<!-- /react-only -->

<!-- html-only -->
## With ef-controls

Use with `ef-controls` to control a non-ancestor element:

```html
<ef-timegroup id="my-video" mode="contain" class="w-full h-96">
  <ef-video src="video.mp4" class="size-full"></ef-video>
</ef-timegroup>

<ef-controls target="my-video">
  <ef-play>
    <button class="px-4 py-2 bg-green-600 text-white rounded">Play</button>
  </ef-play>
</ef-controls>
```

## Target Attribute

Directly target an element by ID without `ef-controls`:

```html
<ef-timegroup id="video-1" mode="contain">
  <ef-video src="video.mp4"></ef-video>
</ef-timegroup>

<ef-play target="video-1">
  <button>Play</button>
</ef-play>
```
<!-- /html-only -->

## Styled Play Overlay

Center a large play button over video:

<!-- html-only -->
```html live
<ef-timegroup mode="contain" class="w-[720px] h-[480px] bg-black relative">
  <ef-video src="https://assets.editframe.com/bars-n-tone.mp4" class="size-full object-contain"></ef-video>

  <ef-play class="absolute inset-0 flex items-center justify-center bg-black/30">
    <button class="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-2xl hover:scale-110 transition">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="white">
        <path d="M8 5v14l11-7z"/>
      </svg>
    </button>
  </ef-play>
</ef-timegroup>
```
<!-- /html-only -->
<!-- react-only -->
```tsx
import { Play, Timegroup, Video } from "@editframe/react";

export const VideoWithPlayButton = () => {
  return (
    <Timegroup mode="contain" className="w-[720px] h-[480px] bg-black relative">
      <Video src="/assets/video.mp4" className="size-full object-contain" />

      <Play className="absolute inset-0 flex items-center justify-center bg-black/30">
        <button className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-2xl hover:scale-110 transition">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="white">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </button>
      </Play>
    </Timegroup>
  );
};
```
<!-- /react-only -->

## With Text Label

<!-- html-only -->
```html live
<ef-timegroup mode="contain" class="w-[720px] h-[480px] bg-black relative">
  <ef-video src="https://assets.editframe.com/bars-n-tone.mp4" class="size-full object-contain"></ef-video>

  <ef-play class="absolute inset-0 flex items-center justify-center">
    <button class="flex flex-col items-center gap-3 text-white hover:scale-105 transition">
      <div class="w-20 h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
      </div>
      <span class="text-sm font-semibold">Click to play</span>
    </button>
  </ef-play>
</ef-timegroup>
```
<!-- /html-only -->
<!-- react-only -->
```tsx
<Play className="absolute inset-0 flex items-center justify-center">
  <button className="flex flex-col items-center gap-3 text-white hover:scale-105 transition">
    <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8 5v14l11-7z"/>
      </svg>
    </div>
    <span className="text-sm font-semibold">Click to play</span>
  </button>
</Play>
```
<!-- /react-only -->

## Separate Play and Pause

<!-- html-only -->
Combine `ef-play` and `ef-pause` for independent buttons that show based on state:

```html live
<ef-timegroup mode="contain" class="w-[720px] h-[480px] bg-black relative">
  <ef-video src="https://assets.editframe.com/bars-n-tone.mp4" class="size-full object-contain"></ef-video>

  <div class="absolute bottom-4 left-4 flex gap-2">
    <ef-play>
      <button class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
        ▶ Play
      </button>
    </ef-play>

    <ef-pause>
      <button class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
        ⏸ Pause
      </button>
    </ef-pause>
  </div>
</ef-timegroup>
```
<!-- /html-only -->
<!-- react-only -->
Combine `Play` and `Pause` for independent buttons that show based on state:

```tsx
import { Play, Pause, Timegroup, Video } from "@editframe/react";

<Timegroup mode="contain" className="w-[720px] h-[480px] bg-black relative">
  <Video src="/assets/video.mp4" className="size-full object-contain" />

  <div className="absolute bottom-4 left-4 flex gap-2">
    <Play>
      <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
        ▶ Play
      </button>
    </Play>

    <Pause>
      <button className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
        ⏸ Pause
      </button>
    </Pause>
  </div>
</Timegroup>
```
<!-- /react-only -->

<!-- react-only -->
## Corner Play Button

Position play button in a corner:

```tsx
<Play className="absolute bottom-4 right-4">
  <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 shadow-lg transition">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z"/>
    </svg>
    <span className="text-sm font-semibold">Play</span>
  </button>
</Play>
```

## Minimal Play Icon

Simple icon-only play button:

```tsx
<Play className="absolute top-4 left-4">
  <button className="w-10 h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white hover:bg-black/70">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z"/>
    </svg>
  </button>
</Play>
```

## With Preview Component

Use inside Preview for non-ancestor element control:

```tsx
import { Preview, Play } from "@editframe/react";

<div className="flex flex-col gap-2">
  <Preview className="w-full h-[600px]" />

  <Play>
    <button className="w-full px-4 py-2 bg-green-600 text-white rounded">
      Play Timeline
    </button>
  </Play>
</div>
```

The Preview component provides context that Play automatically consumes.

## Custom Play Icon

Use any icon library:

```tsx
import { Play } from "@editframe/react";
import { PlayCircle } from "lucide-react";

<Play className="absolute inset-0 flex items-center justify-center">
  <button className="text-white hover:text-blue-400 transition">
    <PlayCircle size={64} strokeWidth={1.5} />
  </button>
</Play>
```
<!-- /react-only -->

## Combining Play and Pause

<!-- html-only -->
Use `ef-toggle-play` if you want a single button that switches between play and pause. Use separate `ef-play` and `ef-pause` buttons if you want independent buttons that auto-hide based on state.
<!-- /html-only -->
<!-- react-only -->
- Use `TogglePlay` for a single button that switches icons
- Use separate `Play` and `Pause` for independent buttons that show/hide based on state
- Choose based on your UI design - both approaches work equally well
<!-- /react-only -->

<!-- react-only -->
## Accessibility

Ensure the button inside Play has proper labels:

```tsx
<Play className="absolute inset-0 flex items-center justify-center">
  <button
    aria-label="Play video"
    className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center"
  >
    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z"/>
    </svg>
  </button>
</Play>
```
<!-- /react-only -->
