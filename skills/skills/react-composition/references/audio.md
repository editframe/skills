# Audio

Add audio tracks with volume control and trimming.

## Import

```tsx
import { Audio } from "@editframe/react";
```

## Props

- `src` - Audio file URL (required)
- `sourceIn` - Start time in source - e.g. `"5s"`, `"1000ms"`
- `sourceOut` - End time in source - e.g. `"10s"`, `"5000ms"`
- `volume` - Volume level - number (0-1), default 1
- `id` - Unique identifier for the audio element

## Basic Usage

```tsx
<Audio src="/assets/music.mp3" />
```

## With Volume

```tsx
<Audio src="/assets/music.mp3" volume={0.3} />
```

## With Trimming

```tsx
<Audio 
  src="/assets/song.mp3"
  sourceIn="30s"
  sourceOut="60s"
  volume={0.5}
/>
```

## Background Music

```tsx
import { Timegroup, Video, Audio } from "@editframe/react";

export const VideoWithMusic = () => {
  return (
    <Timegroup workbench mode="sequence" className="w-[1920px] h-[1080px]">
      {/* Audio spans entire composition */}
      <Audio src="/assets/background-music.mp3" volume={0.2} />
      
      <Timegroup mode="fixed" duration="10s" className="absolute w-full h-full">
        <Video src="/assets/clip1.mp4" className="size-full" />
      </Timegroup>
      
      <Timegroup mode="fixed" duration="10s" className="absolute w-full h-full">
        <Video src="/assets/clip2.mp4" className="size-full" />
      </Timegroup>
    </Timegroup>
  );
};
```

## Multiple Audio Tracks

```tsx
<Timegroup mode="fixed" duration="10s">
  <Audio src="/assets/music.mp3" volume={0.3} />
  <Audio src="/assets/voiceover.mp3" volume={1.0} />
  <Audio src="/assets/sfx.mp3" volume={0.5} />
</Timegroup>
```

## Audio with Waveform

```tsx
import { Audio, Waveform } from "@editframe/react";

<Timegroup mode="contain" className="absolute w-full h-full">
  <Audio id="my-audio" src="/assets/podcast.mp3" />
  <Waveform 
    for="my-audio"
    className="absolute bottom-0 w-full h-24 opacity-50"
  />
</Timegroup>
```

## Dynamic Audio List

```tsx
interface AudioTrack {
  id: string;
  src: string;
  volume: number;
}

const tracks: AudioTrack[] = [
  { id: "music", src: "/assets/music.mp3", volume: 0.3 },
  { id: "voice", src: "/assets/voice.mp3", volume: 1.0 },
];

<Timegroup mode="sequence" className="w-[800px] h-[500px]">
  {tracks.map((track) => (
    <Audio 
      key={track.id}
      id={track.id}
      src={track.src}
      volume={track.volume}
    />
  ))}
</Timegroup>
```

## Synchronized Audio

Audio automatically syncs with the timeline. Use `sourceIn`/`sourceOut` to trim:

```tsx
{/* Play seconds 10-20 from the audio file */}
<Audio 
  src="/assets/long-audio.mp3"
  sourceIn="10s"
  sourceOut="20s"
/>
```
