---
title: Timegroup Element
description: Container element for sequencing and grouping composition elements
type: reference
topic: timegroup
order: 10
---

# ef-timegroup

Container for sequencing and grouping elements.

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| mode | string | - | `"fixed"` \| `"sequence"` \| `"contain"` \| `"fit"` |
| duration | timestring | - | Explicit duration (for fixed mode) |
| overlap | timestring | - | Overlap time between sequence items (e.g., `"1s"`) |
| fps | number | 30 | Frame rate for rendering |
| auto-init | boolean | false | Auto-seek to frame 0 on load (root only) |
| workbench | boolean | false | Enable timeline/hierarchy UI (root only) |

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
