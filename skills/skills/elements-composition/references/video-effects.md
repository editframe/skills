---
title: Video Effects
description: How to apply CSS filters, transforms, and animations to video
type: how-to
topic: video
order: 18
---

# Video Effects

Apply visual effects to video using standard CSS. The video element renders to a canvas, so all CSS properties apply directly.

## CSS Filters

Use Tailwind filter utilities or inline styles:

```html live
<ef-timegroup mode="contain" workbench class="w-[720px] h-[480px] bg-black">
  <ef-video src="https://assets.editframe.com/bars-n-tone.mp4" class="size-full object-contain blur-sm saturate-200 brightness-150 contrast-150"></ef-video>
</ef-timegroup>
```

Common filter classes:

| Effect | Class | Description |
|--------|-------|-------------|
| Blur | `blur-sm` / `blur-md` / `blur-lg` | Gaussian blur |
| Brightness | `brightness-50` / `brightness-150` | Darken or lighten |
| Contrast | `contrast-50` / `contrast-150` | Reduce or increase contrast |
| Grayscale | `grayscale` | Full desaturation |
| Sepia | `sepia` | Warm vintage tone |
| Saturate | `saturate-50` / `saturate-200` | Color intensity |

Combine multiple filters by listing classes:

```html
<ef-video src="video.mp4" class="grayscale contrast-125 brightness-110 size-full"></ef-video>
```

## CSS Transforms

Scale and rotate video elements:

```html live
<ef-timegroup mode="contain" workbench class="w-[720px] h-[480px] bg-black overflow-hidden">
  <ef-video src="https://assets.editframe.com/bars-n-tone.mp4" class="size-full object-contain scale-125 rotate-3"></ef-video>
</ef-timegroup>
```

## CSS Animations

Animate any CSS property over time using `@keyframes`:

```html live
<ef-timegroup mode="contain" workbench class="w-[720px] h-[480px] bg-black overflow-hidden">
  <ef-video src="https://assets.editframe.com/bars-n-tone.mp4" class="size-full object-contain" style="animation: 10s trippy"></ef-video>
  <style>
    @keyframes trippy {
      0% { filter: saturate(2) brightness(1.5) blur(10px); }
      100% { filter: saturate(1) brightness(1) blur(0); }
    }
  </style>
</ef-timegroup>
```

Animations run relative to the video's timeline — they're fully scrubbable.

## Combining Effects

Layer static filters with animations for complex looks:

```html live
<ef-timegroup mode="contain" workbench class="w-[720px] h-[480px] bg-black overflow-hidden">
  <ef-video src="https://assets.editframe.com/bars-n-tone.mp4" class="size-full object-contain sepia" style="animation: 10s zoom-drift"></ef-video>
  <style>
    @keyframes zoom-drift {
      0% { transform: scale(1); }
      100% { transform: scale(1.2); }
    }
  </style>
</ef-timegroup>
```

> **Note:** Static CSS classes (like `sepia`) combine with animation keyframes. The animation overrides only the properties it targets.

## See Also

- [video.md](video.md) — attribute reference
- [transitions.md](transitions.md) — crossfade and slide transitions between clips
