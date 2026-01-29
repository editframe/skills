# ef-audio

Audio element for music, voiceover, sound effects.

## Props

- `src` - URL or path
- `sourcein` / `sourceout` - Absolute trim
- `trimstart` / `trimend` - Relative trim
- `duration` - Override duration
- `volume` - 0.0 to 1.0 (default: 1.0)
- `mute` - Silence audio
- `fft-size` - Required for waveform visualization (e.g., `"256"`)

## Basic Usage

```html
<ef-audio src="music.mp3" volume="0.5"></ef-audio>
```

## Trimming Approaches

Two ways to trim audio - choose based on your workflow:

### Absolute Trimming (sourcein/sourceout)

Use specific timestamps from source. Best for precise timecodes.

```html
<!-- Play seconds 5-10 from source (5s clip) -->
<ef-audio src="voiceover.mp3" sourcein="5s" sourceout="10s" volume="0.8"></ef-audio>
```

### Relative Trimming (trimstart/trimend)

Remove time from start/end. Best for "cut off X seconds" thinking.

```html
<!-- Remove 1s from start, 2s from end -->
<ef-audio src="music.mp3" trimstart="1s" trimend="2s" volume="0.5"></ef-audio>
```

**When to use each:**
- `sourcein`/`sourceout` - Working with timecode, precise frame references
- `trimstart`/`trimend` - UI builders, "how much to cut off" thinking

## Background Music

```html
<ef-timegroup mode="fixed" duration="10s">
  <ef-video src="video.mp4" mute class="size-full"></ef-video>
  <ef-audio src="background-music.mp3" volume="0.3"></ef-audio>
</ef-timegroup>
```

## Multiple Audio Tracks

```html
<ef-timegroup mode="fixed" duration="5s">
  <ef-video src="video.mp4" mute class="size-full"></ef-video>
  <ef-audio src="music.mp3" volume="0.25"></ef-audio>
  <ef-audio src="voiceover.mp3" volume="0.9"></ef-audio>
</ef-timegroup>
```
