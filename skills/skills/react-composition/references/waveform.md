# Waveform

Audio visualization component.

## Import

```tsx
import { Waveform } from "@editframe/react";
```

## Props

- `for` - ID of the audio element to visualize (required)
- `className` - CSS classes for styling
- `style` - Inline styles (useful for colors)

## Basic Usage

```tsx
import { Audio, Waveform } from "@editframe/react";

<Timegroup mode="contain" className="absolute w-full h-full bg-black">
  <Audio id="track1" src="/assets/music.mp3" />
  <Waveform 
    for="track1"
    className="absolute bottom-0 w-full h-32"
  />
</Timegroup>
```

## Styled Waveform

```tsx
<Waveform 
  for="audio1"
  className="absolute bottom-0 w-full h-40 opacity-60"
  style={{ 
    fill: '#3b82f6',  // blue-500
    stroke: '#60a5fa', // blue-400
  }}
/>
```

## Positioned Waveform

```tsx
<Timegroup mode="contain" className="absolute w-full h-full">
  <Audio id="podcast" src="/assets/podcast.mp3" />
  
  {/* Bottom waveform */}
  <Waveform 
    for="podcast"
    className="absolute bottom-0 w-full h-24"
    style={{ fill: '#22c55e' }}
  />
  
  {/* Top waveform (mirrored effect) */}
  <Waveform 
    for="podcast"
    className="absolute top-0 w-full h-24 scale-y-[-1]"
    style={{ fill: '#22c55e', opacity: 0.3 }}
  />
</Timegroup>
```

## With Video

```tsx
import { Timegroup, Video, Audio, Waveform } from "@editframe/react";

<Timegroup mode="contain" className="absolute w-full h-full">
  <Video src="/assets/video.mp4" muted className="size-full object-cover" />
  <Audio id="audio-track" src="/assets/music.mp3" volume={0.5} />
  <Waveform 
    for="audio-track"
    className="absolute bottom-0 w-full h-20 opacity-50"
    style={{ fill: '#ffffff' }}
  />
</Timegroup>
```

## Centered Waveform

```tsx
<Timegroup mode="contain" className="absolute w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900 to-blue-900">
  <Audio id="beat" src="/assets/beat.mp3" />
  <Waveform 
    for="beat"
    className="w-3/4 h-64"
    style={{ fill: '#a855f7', stroke: '#c084fc' }}
  />
</Timegroup>
```

## Multiple Audio Tracks

```tsx
<Timegroup mode="fixed" duration="10s" className="absolute w-full h-full">
  <Audio id="music" src="/assets/music.mp3" volume={0.3} />
  <Audio id="voice" src="/assets/voice.mp3" volume={1.0} />
  
  <Waveform 
    for="music"
    className="absolute bottom-0 w-full h-16"
    style={{ fill: '#3b82f6', opacity: 0.6 }}
  />
  
  <Waveform 
    for="voice"
    className="absolute bottom-16 w-full h-32"
    style={{ fill: '#22c55e', opacity: 0.8 }}
  />
</Timegroup>
```

## Podcast/Audio Visualization

```tsx
import { Audio, Waveform, Text, Image } from "@editframe/react";

export const PodcastVisualizer = () => {
  return (
    <Timegroup 
      workbench 
      mode="contain"
      className="w-[1920px] h-[1080px] bg-gradient-to-br from-slate-900 to-slate-800"
    >
      <Audio id="episode" src="/assets/podcast.mp3" />
      
      {/* Podcast artwork */}
      <Image 
        src="/assets/podcast-cover.jpg"
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 rounded-lg shadow-2xl"
      />
      
      {/* Waveform */}
      <Waveform 
        for="episode"
        className="absolute bottom-32 w-full h-40"
        style={{ fill: '#3b82f6', opacity: 0.7 }}
      />
      
      {/* Title */}
      <Text 
        duration="contain"
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white text-2xl"
      >
        Episode 42: The Future of AI
      </Text>
    </Timegroup>
  );
};
```

## Dynamic Colors

```tsx
import { useState } from "react";

const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444'];

const [colorIndex, setColorIndex] = useState(0);

<Waveform 
  for="audio"
  className="absolute bottom-0 w-full h-32"
  style={{ fill: colors[colorIndex] }}
/>
```
