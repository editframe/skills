# ef-video

Video element with source trimming.

## Props

- `src` - URL or path
- `sourcein` / `sourceout` - Absolute trim (e.g., `"5s"`, `"10s"`)
- `trimstart` / `trimend` - Relative trim (e.g., `"2s"`, `"3s"`)
- `duration` - Override duration
- `mute` - Silence audio track
- `volume` - 0.0 to 1.0

## Basic Usage

```html
<ef-video src="video.mp4" class="size-full object-cover"></ef-video>
```

## Trimming Approaches

Two ways to trim video - choose based on your workflow:

### Absolute Trimming (sourcein/sourceout)

Show specific timestamps from source. Use when you know exact timecodes.

```html
<!-- Show seconds 5-15 from source (10s clip) -->
<ef-video src="video.mp4" sourcein="5s" sourceout="15s" class="size-full"></ef-video>
```

### Relative Trimming (trimstart/trimend)

Remove time from start/end. Use when thinking "cut off X seconds".

```html
<!-- Remove 2s from start, 3s from end -->
<ef-video src="video.mp4" trimstart="2s" trimend="3s" class="size-full"></ef-video>
```

**When to use each:**
- `sourcein`/`sourceout` - Working with timecode, precise frame references
- `trimstart`/`trimend` - UI builders, "how much to cut off" thinking

## Muted / Volume

```html
<ef-video src="video.mp4" mute class="size-full"></ef-video>
<ef-video src="video.mp4" volume="0.5" class="size-full"></ef-video>
```

## Picture-in-Picture

```html
<ef-timegroup mode="fixed" duration="6s" class="absolute w-full h-full">
  <ef-video src="main.mp4" class="size-full object-cover"></ef-video>
  <ef-video src="overlay.mp4" class="absolute bottom-4 right-4 w-48 h-28 rounded-lg border-2 border-white"></ef-video>
</ef-timegroup>
```
