# ef-video

Video element with source trimming.

## Props

- `src` - URL or path
- `sourcein` / `sourceout` - Trim source (e.g., `"5s"`, `"10s"`)
- `duration` - Override duration
- `mute` - Silence audio track
- `volume` - 0.0 to 1.0

## Basic Usage

```html
<ef-video src="video.mp4" class="size-full object-cover"></ef-video>
```

## Trimming

```html
<ef-video src="video.mp4" sourcein="5s" sourceout="15s" class="size-full"></ef-video>
```

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
