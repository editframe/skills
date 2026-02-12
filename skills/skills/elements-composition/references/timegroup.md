---
title: Timegroup Element
description: Container element for sequencing and grouping composition elements
type: reference
nav:
  parent: "Elements / Layout"
  priority: 20
  related: ["timegroup-modes", "sequencing"]
track: "layout-mastery"
track_step: 1
track_title: "Understanding Timegroups"
next_steps: ["timegroup-modes"]
api:
  attributes:
    - name: mode
      type: string
      required: true
      description: Duration calculation mode
      values: ["fixed", "sequence", "contain", "fit"]
    - name: duration
      type: timestring
      description: Explicit duration (for fixed mode)
    - name: overlap
      type: timestring
      description: Overlap time between sequence items (e.g., "1s")
    - name: fps
      type: number
      default: 30
      description: Frame rate for rendering
    - name: auto-init
      type: boolean
      default: false
      description: Auto-seek to frame 0 on load (root only)
    - name: workbench
      type: boolean
      default: false
      description: Enable timeline/hierarchy UI (root only)
---

# ef-timegroup

Container for sequencing and grouping elements.

## Modes

- `fixed` - Uses `duration` attribute
- `sequence` - Sum of children (sequential playback)
- `contain` - Longest child duration
- `fit` - Inherit from parent

## Root Timegroup

```html live
<ef-timegroup mode="sequence" workbench class="w-[720px] h-[480px] bg-black">
  <ef-timegroup mode="fixed" duration="3s" class="absolute w-full h-full flex items-center justify-center">
    <ef-text duration="3s" class="text-white text-3xl">Scene 1</ef-text>
  </ef-timegroup>
  <ef-timegroup mode="fixed" duration="3s" class="absolute w-full h-full flex items-center justify-center">
    <ef-text duration="3s" class="text-white text-3xl">Scene 2</ef-text>
  </ef-timegroup>
</ef-timegroup>
```

## Scene (Fixed Duration)

```html
<ef-timegroup mode="fixed" duration="5s" class="absolute w-full h-full">
  <ef-video src="clip.mp4" class="size-full object-cover"></ef-video>
  <ef-text class="absolute top-4 left-4 text-white">Overlay</ef-text>
</ef-timegroup>
```

## Nested Sequence

```html
<ef-timegroup mode="sequence">
  <ef-timegroup mode="fixed" duration="3s"><!-- Scene 1 --></ef-timegroup>
  <ef-timegroup mode="fixed" duration="5s"><!-- Scene 2 --></ef-timegroup>
  <ef-timegroup mode="fixed" duration="4s"><!-- Scene 3 --></ef-timegroup>
</ef-timegroup>
```

## Sequence with Overlap

Use `overlap` to create transitions between items:

```html
<ef-timegroup mode="sequence" overlap="1s">
  <ef-timegroup mode="contain"><!-- Scene 1 --></ef-timegroup>
  <ef-timegroup mode="contain"><!-- Scene 2 --></ef-timegroup>
</ef-timegroup>
```

See [transitions.md](transitions.md) for crossfade examples.

## Scripting

Add dynamic behavior with JavaScript. See [scripting.md](scripting.md) for details.

```html
<ef-timegroup id="dynamic-scene" mode="fixed" duration="5s">
  <div class="dynamic-text"></div>
</ef-timegroup>

<script>
  const tg = document.querySelector('#dynamic-scene');
  tg.initializer = (instance) => {
    instance.addFrameTask((info) => {
      const text = instance.querySelector('.dynamic-text');
      text.textContent = `Time: ${(info.ownCurrentTimeMs / 1000).toFixed(2)}s`;
    });
  };
</script>
```
