---
title: Video Element
description: Video element with source trimming, volume control, and muting
type: reference
topic: video
order: 15
---

# ef-video

Video element with source trimming.

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| src | string | - | URL or path to video source |
| sourcein | timestring | - | Absolute start time in source media |
| sourceout | timestring | - | Absolute end time in source media |
| trimstart | timestring | - | Duration to trim from start |
| trimend | timestring | - | Duration to trim from end |
| duration | timestring | - | Override element duration |
| mute | boolean | false | Silence the audio track |
| volume | number | 1.0 | Audio volume (0.0 to 1.0) |

## Basic Usage

```html live
<ef-timegroup mode="contain" workbench class="w-[720px] h-[480px] bg-black">
  <ef-video src="https://assets.editframe.com/bars-n-tone.mp4" class="size-full object-contain"></ef-video>
</ef-timegroup>
```

## Trimming Approaches

Two ways to trim video — choose based on your workflow:

### Absolute Trimming (sourcein/sourceout)

Show specific timestamps from source. Use when you know exact timecodes.

```html live
<ef-timegroup mode="contain" workbench class="w-[720px] h-[480px] bg-black">
  <ef-video src="https://assets.editframe.com/bars-n-tone.mp4" sourcein="2s" sourceout="6s" class="size-full object-contain"></ef-video>
</ef-timegroup>
```

### Relative Trimming (trimstart/trimend)

Remove time from start/end. Use when thinking "cut off X seconds".

```html live
<ef-timegroup mode="contain" workbench class="w-[720px] h-[480px] bg-black">
  <ef-video src="https://assets.editframe.com/bars-n-tone.mp4" trimstart="2s" trimend="3s" class="size-full object-contain"></ef-video>
</ef-timegroup>
```

**When to use each:**
- `sourcein`/`sourceout` — Working with timecodes, precise frame references
- `trimstart`/`trimend` — UI builders, "how much to cut off" thinking

## Muted / Volume

```html
<ef-video src="video.mp4" mute class="size-full"></ef-video>
<ef-video src="video.mp4" volume="0.5" class="size-full"></ef-video>
```

## Picture-in-Picture

```html live
<ef-timegroup mode="contain" workbench class="w-[720px] h-[480px] bg-black">
  <ef-video src="https://assets.editframe.com/bars-n-tone.mp4" class="size-full object-cover"></ef-video>
  <ef-video src="https://assets.editframe.com/bars-n-tone.mp4" sourcein="5s" class="absolute bottom-4 right-4 w-48 h-28 rounded-lg border-2 border-white"></ef-video>
</ef-timegroup>
```
