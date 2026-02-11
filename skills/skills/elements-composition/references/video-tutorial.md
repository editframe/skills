---
title: Video Tutorial
description: Step-by-step guide to working with the video element
type: tutorial
topic: video
order: 11
---

# Video Tutorial

Build a composition step by step — from a single clip to layered scenes.

### Step 1: Display a Basic Video

Place a video inside a root timegroup. The `workbench` attribute adds timeline controls.

```html live
<ef-timegroup mode="contain" workbench class="w-[720px] h-[480px] bg-black">
  <ef-video src="https://assets.editframe.com/bars-n-tone.mp4" class="size-full object-contain"></ef-video>
</ef-timegroup>
```

### Step 2: Trim a Video

Two approaches — choose based on your workflow.

**Relative trimming** removes time from edges:

```html live
<ef-timegroup mode="contain" workbench class="w-[720px] h-[480px] bg-black">
  <ef-video src="https://assets.editframe.com/bars-n-tone.mp4" trimstart="2s" trimend="2s" class="size-full object-contain"></ef-video>
</ef-timegroup>
```

**Absolute trimming** specifies exact timecodes:

```html live
<ef-timegroup mode="contain" workbench class="w-[720px] h-[480px] bg-black">
  <ef-video src="https://assets.editframe.com/bars-n-tone.mp4" sourcein="2s" sourceout="4s" class="size-full object-contain"></ef-video>
</ef-timegroup>
```

See [video-trimming.md](video-trimming.md) for detailed guidance on choosing between them.

### Step 3: Create a Simple Sequence

Use `mode="sequence"` to play clips one after another. The timeline duration is the sum of all children.

```html live
<ef-timegroup mode="sequence" workbench class="w-[720px] h-[480px] bg-black">
  <ef-video src="https://assets.editframe.com/bars-n-tone.mp4" sourcein="0s" sourceout="2s" class="size-full object-contain"></ef-video>
  <ef-video src="https://assets.editframe.com/bars-n-tone.mp4" sourcein="8s" class="size-full object-contain"></ef-video>
  <ef-video src="https://assets.editframe.com/bars-n-tone.mp4" sourcein="2s" sourceout="4s" class="size-full object-contain"></ef-video>
</ef-timegroup>
```

### Step 4: Layer Videos with Text

Nest timegroups inside a sequence. Each child timegroup holds a video background and text overlay.

```html live
<ef-timegroup mode="sequence" workbench class="w-[720px] h-[480px] bg-black">
  <ef-timegroup class="flex flex-col items-center justify-center">
    <ef-video src="https://assets.editframe.com/bars-n-tone.mp4" sourcein="0s" sourceout="3s" class="z-0 absolute top-0 left-0 size-full object-contain"></ef-video>
    <h1 class="relative bg-blue-500 text-4xl p-2 text-white">First Scene</h1>
  </ef-timegroup>
  <ef-timegroup class="flex flex-col items-center justify-center">
    <ef-video src="https://assets.editframe.com/bars-n-tone.mp4" sourcein="8s" class="z-0 absolute top-0 left-0 size-full object-contain"></ef-video>
    <h1 class="relative bg-blue-500 text-4xl p-2 text-white">Second Scene</h1>
  </ef-timegroup>
</ef-timegroup>
```

> **Note:** The video uses `absolute` positioning with `z-0` as a background layer. Text uses `relative` positioning to appear on top.

### Next Steps

- [video.md](video.md) — attribute reference
- [video-trimming.md](video-trimming.md) — trimming deep-dive
- [video-effects.md](video-effects.md) — CSS filters and animations
- [sequencing.md](sequencing.md) — advanced sequence patterns
