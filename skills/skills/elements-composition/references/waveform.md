# ef-waveform

Audio waveform visualization.

## Props

- `target` - ID of `ef-audio` or `ef-video` element
- `mode` - `"bars"` | `"roundBars"` | `"line"` | `"curve"` | `"wave"` | `"spikes"` | `"bricks"` | `"pixel"` (default: `"bars"`)
- `bar-spacing` - Spacing between bars (default: 0.5)
- `line-width` - Line width for line/curve modes (default: 4)

## Basic Usage

```html
<ef-audio id="audio" fft-size="256" src="music.mp3"></ef-audio>
<ef-waveform target="audio" mode="bars" class="text-green-400 w-3/4 h-32"></ef-waveform>
```

## Full Scene

```html
<ef-timegroup mode="fixed" duration="5s" class="absolute w-full h-full bg-slate-800 flex flex-col items-center justify-center">
  <ef-audio id="waveform-audio" fft-size="256" src="music.mp3" volume="0.6"></ef-audio>
  <ef-waveform mode="bars" target="waveform-audio" class="text-green-400 w-3/4 h-32"></ef-waveform>
  <ef-text duration="5s" class="text-white text-lg mt-4">Audio Waveform</ef-text>
</ef-timegroup>
```

## Modes

```html
<ef-waveform target="audio" mode="bars"></ef-waveform>
<ef-waveform target="audio" mode="roundBars"></ef-waveform>
<ef-waveform target="audio" mode="line" line-width="2"></ef-waveform>
<ef-waveform target="audio" mode="curve"></ef-waveform>
<ef-waveform target="audio" mode="wave"></ef-waveform>
<ef-waveform target="audio" mode="spikes"></ef-waveform>
```

Color uses `currentColor` (set via Tailwind `text-*` classes).
