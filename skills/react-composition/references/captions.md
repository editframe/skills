# Captions

Display subtitles with word-level highlighting.

## Import

```tsx
import { 
  Captions, 
  CaptionsSegment,
  CaptionsActiveWord,
  CaptionsBeforeActiveWord,
  CaptionsAfterActiveWord
} from "@editframe/react";
```

## Props

- `src` - Captions JSON file URL (required)
- `className` - CSS classes for styling
- `id` - Unique identifier

## Caption Format

Captions use JSON format with segments and words:

```json
{
  "segments": [
    {
      "text": "Hello world",
      "start": 0,
      "end": 2000,
      "words": [
        { "word": "Hello", "start": 0, "end": 500 },
        { "word": "world", "start": 500, "end": 2000 }
      ]
    }
  ]
}
```

## Basic Usage

```tsx
<Captions 
  src="/assets/captions.json"
  className="absolute bottom-8 text-white text-2xl text-center w-full"
/>
```

## With Video

```tsx
import { Timegroup, Video, Captions } from "@editframe/react";

<Timegroup mode="contain" className="absolute w-full h-full">
  <Video src="/assets/video.mp4" className="size-full object-cover" />
  <Captions 
    src="/assets/captions.json"
    className="absolute bottom-16 text-white text-3xl text-center w-full px-8"
  />
</Timegroup>
```

## Styled Segments

Use caption components for custom styling:

```tsx
<Captions src="/assets/captions.json" className="absolute bottom-8 w-full text-center">
  <CaptionsSegment className="text-2xl">
    <CaptionsBeforeActiveWord className="text-gray-400" />
    <CaptionsActiveWord className="text-white font-bold bg-blue-500 px-1" />
    <CaptionsAfterActiveWord className="text-gray-400" />
  </CaptionsSegment>
</Captions>
```

## Word Highlighting

```tsx
<Captions src="/assets/captions.json" className="absolute bottom-12 w-full text-center">
  <CaptionsSegment className="text-3xl px-4">
    <CaptionsBeforeActiveWord className="opacity-50" />
    <CaptionsActiveWord className="text-yellow-400 font-bold scale-110 inline-block" />
    <CaptionsAfterActiveWord className="opacity-50" />
  </CaptionsSegment>
</Captions>
```

## Background Box

```tsx
<Captions 
  src="/assets/captions.json"
  className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/80 px-6 py-3 rounded-lg text-white text-2xl max-w-[800px]"
/>
```

## Generate Captions

Use the Editframe CLI to generate captions from video/audio files:

```bash
npx @editframe/cli transcribe input.mp4 -o captions.json
```

This uses `whisper_timestamped` to create word-level timestamps. Install it first:

```bash
pip3 install whisper-timestamped
```

See the `elements-composition` skill's [transcription.md](../../elements-composition/references/transcription.md) for more details.

## Multiple Caption Tracks

```tsx
<Timegroup mode="contain" className="absolute w-full h-full">
  <Video src="/assets/video.mp4" className="size-full" />
  
  {/* English subtitles */}
  <Captions 
    id="en"
    src="/assets/captions-en.json"
    className="absolute bottom-24 text-white text-2xl text-center w-full"
  />
  
  {/* Spanish subtitles */}
  <Captions 
    id="es"
    src="/assets/captions-es.json"
    className="absolute bottom-8 text-yellow-300 text-xl text-center w-full"
  />
</Timegroup>
```

## Dynamic Captions

```tsx
interface CaptionTrack {
  id: string;
  src: string;
  language: string;
}

const tracks: CaptionTrack[] = [
  { id: "en", src: "/assets/captions-en.json", language: "English" },
  { id: "es", src: "/assets/captions-es.json", language: "Spanish" },
];

const [selectedTrack, setSelectedTrack] = useState(tracks[0]);

<Timegroup mode="contain" className="absolute w-full h-full">
  <Video src="/assets/video.mp4" className="size-full" />
  <Captions 
    src={selectedTrack.src}
    className="absolute bottom-8 text-white text-2xl text-center w-full"
  />
</Timegroup>
```
