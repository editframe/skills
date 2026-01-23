# ef-audio

Audio element for music, voiceover, sound effects.

## Props

- `src` - URL or path
- `sourcein` / `sourceout` - Trim source
- `duration` - Override duration
- `volume` - 0.0 to 1.0 (default: 1.0)
- `mute` - Silence audio
- `fft-size` - FFT size for frequency analysis (for waveform)

## Basic Usage

```html
<ef-audio src="music.mp3" volume="0.5"></ef-audio>
```

## Background Music

```html
<ef-timegroup mode="fixed" duration="10s">
  <ef-video src="video.mp4" mute class="size-full"></ef-video>
  <ef-audio src="background-music.mp3" volume="0.3"></ef-audio>
</ef-timegroup>
```

## Voiceover

```html
<ef-audio src="voiceover.mp3" sourcein="5s" sourceout="10s" volume="0.8"></ef-audio>
```

## Multiple Audio Tracks

```html
<ef-timegroup mode="fixed" duration="5s">
  <ef-video src="video.mp4" mute class="size-full"></ef-video>
  <ef-audio src="music.mp3" volume="0.25"></ef-audio>
  <ef-audio src="voiceover.mp3" volume="0.9"></ef-audio>
</ef-timegroup>
```

## For Waveform Visualization

```html
<ef-audio id="audio-track" fft-size="256" src="music.mp3"></ef-audio>
<ef-waveform target="audio-track" mode="bars"></ef-waveform>
```
