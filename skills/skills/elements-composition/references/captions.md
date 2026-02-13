---
title: Captions Element
description: Synchronized captions with word-level highlighting
type: reference
nav:
  parent: "Elements / Text & Graphics"
  priority: 31
  related: ["text", "transcription"]
api:
  attributes:
    - name: target
      type: string
      description: Selector for ef-video or ef-audio element
    - name: captions-script
      type: string
      description: ID of script element with JSON captions
    - name: captions-src
      type: string
      description: URL to JSON captions file
    - name: captions-data
      type: object
      description: Direct captions data object
---

# ef-captions

Synchronized captions with word highlighting.

## Basic Usage

```html live
<ef-timegroup mode="contain" class="w-[720px] h-[480px] bg-black">
  <ef-video id="my-video" src="https://assets.editframe.com/bars-n-tone.mp4" class="size-full object-contain"></ef-video>

  <ef-captions captions-script="captions-data" class="absolute bottom-8 left-4 right-4 text-center">
    <ef-captions-before-active-word class="text-white/60 text-xl"></ef-captions-before-active-word>
    <ef-captions-active-word class="text-yellow-300 text-xl font-bold"></ef-captions-active-word>
    <ef-captions-after-active-word class="text-white/40 text-xl"></ef-captions-after-active-word>
  </ef-captions>

  <script type="application/json" id="captions-data">
  {
    "segments": [
      { "start": 0, "end": 3, "text": "Welcome to the demo." },
      { "start": 3, "end": 6, "text": "This shows captions." }
    ],
    "word_segments": [
      { "start": 0, "end": 0.5, "text": "Welcome" },
      { "start": 0.5, "end": 0.7, "text": "to" },
      { "start": 0.7, "end": 0.9, "text": "the" },
      { "start": 0.9, "end": 1.4, "text": "demo." },
      { "start": 3.0, "end": 3.4, "text": "This" },
      { "start": 3.4, "end": 3.8, "text": "shows" },
      { "start": 3.8, "end": 4.5, "text": "captions." }
    ]
  }
  </script>
</ef-timegroup>
```

## Caption Data Format

```json
{
  "segments": [
    { "start": 0, "end": 3, "text": "Sentence one." }
  ],
  "word_segments": [
    { "start": 0, "end": 0.5, "text": "Sentence" },
    { "start": 0.5, "end": 1.0, "text": "one." }
  ]
}
```

Times are in seconds relative to the parent timegroup.
