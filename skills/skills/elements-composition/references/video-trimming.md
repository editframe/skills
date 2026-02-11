---
title: Trimming Video
description: How to trim video clips using absolute or relative approaches
type: how-to
topic: video
order: 12
---

# Trimming Video

Two approaches to show only part of a video source. Choose based on your workflow.

## Relative Trimming (trimstart / trimend)

Remove time from the edges. Think: "cut off 2 seconds from the start."

```html live
<ef-timegroup mode="contain" workbench class="w-[720px] h-[480px] bg-black">
  <ef-video src="https://assets.editframe.com/bars-n-tone.mp4" trimstart="2s" trimend="3s" class="size-full object-contain"></ef-video>
</ef-timegroup>
```

Duration formula: `sourceDuration - trimstart - trimend`

A 10s source with `trimstart="2s" trimend="3s"` produces a 5s clip.

## Absolute Trimming (sourcein / sourceout)

Specify exact timestamps. Think: "show seconds 2 through 6."

```html live
<ef-timegroup mode="contain" workbench class="w-[720px] h-[480px] bg-black">
  <ef-video src="https://assets.editframe.com/bars-n-tone.mp4" sourcein="2s" sourceout="6s" class="size-full object-contain"></ef-video>
</ef-timegroup>
```

Duration formula: `sourceout - sourcein`

`sourcein="2s" sourceout="6s"` produces a 4s clip starting at the 2-second mark.

## When to Use Each

| Approach | Use when... |
|----------|-------------|
| `trimstart` / `trimend` | Building UI with drag handles or sliders |
| | Thinking "how much to cut off" |
| | Adjusting existing clip duration |
| `sourcein` / `sourceout` | Working with known timecodes |
| | Referencing specific moments by timestamp |
| | Frame-perfect accuracy needed |

## Trimmed Clips in a Sequence

Trimming is most useful when building sequences from different parts of source media:

```html live
<ef-timegroup mode="sequence" workbench class="w-[720px] h-[480px] bg-black">
  <ef-video src="https://assets.editframe.com/bars-n-tone.mp4" sourceout="2s" class="size-full object-contain"></ef-video>
  <ef-video src="https://assets.editframe.com/bars-n-tone.mp4" sourcein="5s" sourceout="8s" class="size-full object-contain"></ef-video>
  <ef-video src="https://assets.editframe.com/bars-n-tone.mp4" sourcein="8s" class="size-full object-contain"></ef-video>
</ef-timegroup>
```

> **Note:** Both approaches produce the same visual result — they differ in mental model and how `currentSourceTimeMs` tracks source position. Relative trimming maps as `trimstart + ownCurrentTimeMs`, absolute as `sourcein + ownCurrentTimeMs`.

## See Also

- [video.md](video.md) — attribute reference
- [video-tutorial.md](video-tutorial.md) — step-by-step introduction
