---
title: Caption Sub-Elements
description: Slot elements for styling caption segments and active words
type: reference
nav:
  parent: "Media"
  priority: 31
  related: ["captions", "text"]
api:
  attributes:
    - name: wordText
      type: string
      description: "Text of active word (ef-captions-active-word only)"
      element: ef-captions-active-word
    - name: wordIndex
      type: number
      description: "Index of active word (ef-captions-active-word only)"
      element: ef-captions-active-word
    - name: segmentText
      type: string
      description: "Text of caption segment"
      element: ef-captions-segment, ef-captions-before-active-word, ef-captions-after-active-word
---

# Caption Sub-Elements

Slot elements for styling different parts of synchronized captions.

## Overview

`ef-captions` uses child elements to separate caption text into styleable parts:

- `ef-captions-active-word` - Currently spoken word
- `ef-captions-before-active-word` - Words already spoken in current segment
- `ef-captions-after-active-word` - Words not yet spoken in current segment
- `ef-captions-segment` - Full caption segment text

These elements act as **slots** — they're containers that `ef-captions` fills with text. You style them with CSS classes, and `ef-captions` handles updating their content.

## Basic Word Highlighting

```html live
<ef-timegroup mode="contain" class="w-[720px] h-[480px] bg-black">
  <ef-video src="https://assets.editframe.com/bars-n-tone.mp4" class="size-full object-contain"></ef-video>

  <ef-captions captions-script="captions1" class="absolute bottom-12 left-0 right-0 text-center">
    <ef-captions-before-active-word class="text-white/50 text-xl"></ef-captions-before-active-word>
    <ef-captions-active-word class="text-yellow-300 text-xl font-bold"></ef-captions-active-word>
    <ef-captions-after-active-word class="text-white/30 text-xl"></ef-captions-after-active-word>
  </ef-captions>

  <script type="application/json" id="captions1">
  {
    "segments": [
      { "start": 0, "end": 3, "text": "Welcome to the video." },
      { "start": 3, "end": 6, "text": "This demonstrates captions." }
    ],
    "word_segments": [
      { "start": 0, "end": 0.5, "text": "Welcome" },
      { "start": 0.5, "end": 0.7, "text": "to" },
      { "start": 0.7, "end": 0.9, "text": "the" },
      { "start": 0.9, "end": 1.5, "text": "video." },
      { "start": 3.0, "end": 3.3, "text": "This" },
      { "start": 3.3, "end": 3.8, "text": "demonstrates" },
      { "start": 3.8, "end": 4.5, "text": "captions." }
    ]
  }
  </script>
</ef-timegroup>
```

## Karaoke-Style Captions

Use background colors and padding for a karaoke effect.

```html live
<ef-timegroup mode="contain" class="w-[720px] h-[480px] bg-black">
  <ef-video src="https://assets.editframe.com/bars-n-tone.mp4" class="size-full object-contain"></ef-video>

  <ef-captions captions-script="captions2" class="absolute bottom-16 left-0 right-0 text-center leading-relaxed">
    <ef-captions-before-active-word class="text-white/60 text-2xl"></ef-captions-before-active-word>
    <ef-captions-active-word class="text-white text-2xl bg-blue-500 px-2 py-1 rounded-md"></ef-captions-active-word>
    <ef-captions-after-active-word class="text-white/40 text-2xl"></ef-captions-after-active-word>
  </ef-captions>

  <script type="application/json" id="captions2">
  {
    "segments": [
      { "start": 0, "end": 3, "text": "Sing along with me." }
    ],
    "word_segments": [
      { "start": 0, "end": 0.6, "text": "Sing" },
      { "start": 0.6, "end": 1.2, "text": "along" },
      { "start": 1.2, "end": 1.5, "text": "with" },
      { "start": 1.5, "end": 2.0, "text": "me." }
    ]
  }
  </script>
</ef-timegroup>
```

## Full Segment Display

Show the entire caption segment without word-level highlighting.

```html live
<ef-timegroup mode="contain" class="w-[720px] h-[480px] bg-black">
  <ef-video src="https://assets.editframe.com/bars-n-tone.mp4" class="size-full object-contain"></ef-video>

  <ef-captions captions-script="captions3" class="absolute bottom-12 left-0 right-0 text-center">
    <ef-captions-segment class="text-white text-2xl bg-black/80 px-4 py-2 rounded-lg inline-block"></ef-captions-segment>
  </ef-captions>

  <script type="application/json" id="captions3">
  {
    "segments": [
      { "start": 0, "end": 3, "text": "Full segment captions." },
      { "start": 3, "end": 6, "text": "No word highlighting." }
    ],
    "word_segments": []
  }
  </script>
</ef-timegroup>
```

## Combined Segment and Word Highlighting

Mix segment and word-level styling for layered effects.

```html live
<ef-timegroup mode="contain" class="w-[720px] h-[480px] bg-black">
  <ef-video src="https://assets.editframe.com/bars-n-tone.mp4" class="size-full object-contain"></ef-video>

  <ef-captions captions-script="captions4" class="absolute bottom-20 left-0 right-0">
    <!-- Full segment in background -->
    <ef-captions-segment class="block text-center text-white/30 text-xl mb-2"></ef-captions-segment>

    <!-- Word highlighting on separate line -->
    <div class="text-center">
      <ef-captions-before-active-word class="text-white/70 text-2xl"></ef-captions-before-active-word>
      <ef-captions-active-word class="text-cyan-400 text-3xl font-bold underline"></ef-captions-active-word>
      <ef-captions-after-active-word class="text-white/50 text-2xl"></ef-captions-after-active-word>
    </div>
  </ef-captions>

  <script type="application/json" id="captions4">
  {
    "segments": [
      { "start": 0, "end": 3, "text": "Multi-layer caption styling." }
    ],
    "word_segments": [
      { "start": 0, "end": 0.6, "text": "Multi-layer" },
      { "start": 0.6, "end": 1.2, "text": "caption" },
      { "start": 1.2, "end": 1.8, "text": "styling." }
    ]
  }
  </script>
</ef-timegroup>
```

## Animated Active Word

Use `--ef-word-seed` CSS variable for per-word randomness in animations.

```html live
<ef-timegroup mode="contain" class="w-[720px] h-[480px] bg-black">
  <ef-video src="https://assets.editframe.com/bars-n-tone.mp4" class="size-full object-contain"></ef-video>

  <ef-captions captions-script="captions5" class="absolute bottom-12 left-0 right-0 text-center">
    <ef-captions-before-active-word class="text-white/60 text-xl"></ef-captions-before-active-word>
    <ef-captions-active-word class="active-pop text-white text-2xl font-bold"></ef-captions-active-word>
    <ef-captions-after-active-word class="text-white/40 text-xl"></ef-captions-after-active-word>
  </ef-captions>

  <style>
    @keyframes wordPop {
      0% {
        transform: scale(0.5) rotate(calc(var(--ef-word-seed) * 20deg - 10deg));
        opacity: 0;
      }
      50% {
        transform: scale(1.2) rotate(0deg);
      }
      100% {
        transform: scale(1) rotate(0deg);
        opacity: 1;
      }
    }

    .active-pop {
      display: inline-block;
      animation: wordPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      color: #fbbf24;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
    }
  </style>

  <script type="application/json" id="captions5">
  {
    "segments": [
      { "start": 0, "end": 3, "text": "Each word pops in." }
    ],
    "word_segments": [
      { "start": 0, "end": 0.5, "text": "Each" },
      { "start": 0.5, "end": 1.0, "text": "word" },
      { "start": 1.0, "end": 1.5, "text": "pops" },
      { "start": 1.5, "end": 2.0, "text": "in." }
    ]
  }
  </script>
</ef-timegroup>
```

## Gradient Progression

Style words based on their position (spoken/current/upcoming).

```html live
<ef-timegroup mode="contain" class="w-[720px] h-[480px] bg-black">
  <ef-video src="https://assets.editframe.com/bars-n-tone.mp4" class="size-full object-contain"></ef-video>

  <ef-captions captions-script="captions6" class="absolute bottom-12 left-0 right-0 text-center text-2xl font-semibold">
    <ef-captions-before-active-word class="text-green-400"></ef-captions-before-active-word>
    <ef-captions-active-word class="text-yellow-300 text-3xl"></ef-captions-active-word>
    <ef-captions-after-active-word class="text-gray-500"></ef-captions-after-active-word>
  </ef-captions>

  <script type="application/json" id="captions6">
  {
    "segments": [
      { "start": 0, "end": 4, "text": "Spoken words turn green." }
    ],
    "word_segments": [
      { "start": 0, "end": 0.5, "text": "Spoken" },
      { "start": 0.5, "end": 1.0, "text": "words" },
      { "start": 1.0, "end": 1.5, "text": "turn" },
      { "start": 1.5, "end": 2.0, "text": "green." }
    ]
  }
  </script>
</ef-timegroup>
```

## Element Descriptions

### ef-captions-active-word

The word currently being spoken. Automatically hidden when empty or contains only punctuation.

**CSS Variables:**
- `--ef-word-seed` - Deterministic random (0-1) per word for animations

**Behavior:**
- Adds trailing space automatically for proper word spacing
- Hidden via `hidden` attribute when no active word

### ef-captions-before-active-word

All words in the current segment that have already been spoken.

**Behavior:**
- Adds trailing space when followed by active word
- Hidden via `hidden` attribute when no prior words

### ef-captions-after-active-word

All words in the current segment not yet spoken.

**Behavior:**
- No leading space (active word adds trailing space)
- Hidden via `hidden` attribute when no upcoming words

### ef-captions-segment

The full text of the current caption segment.

**Behavior:**
- Hidden via `hidden` attribute when no active segment
- Can be used alone or alongside word-level elements

## Layout Patterns

All caption sub-elements use `display: inline` by default for natural text flow. They act as transparent containers — the text flows as if the element boundaries don't exist.

```html
<!-- Inline flow (default) -->
<ef-captions class="text-white text-xl">
  <ef-captions-before-active-word></ef-captions-before-active-word>
  <ef-captions-active-word class="font-bold"></ef-captions-active-word>
  <ef-captions-after-active-word></ef-captions-after-active-word>
</ef-captions>

<!-- Multi-line layout -->
<ef-captions>
  <div class="text-center">
    <ef-captions-segment class="block text-white/50 mb-1"></ef-captions-segment>
  </div>
  <div class="text-center">
    <ef-captions-active-word class="text-yellow-400 text-2xl"></ef-captions-active-word>
  </div>
</ef-captions>
```

## Caption Data Format

All caption sub-elements require properly formatted caption data:

```json
{
  "segments": [
    { "start": 0, "end": 3, "text": "Full sentence text." }
  ],
  "word_segments": [
    { "start": 0, "end": 0.5, "text": "Full" },
    { "start": 0.5, "end": 1.0, "text": "sentence" },
    { "start": 1.0, "end": 1.5, "text": "text." }
  ]
}
```

Times are in seconds. `word_segments` are optional — if omitted, only `ef-captions-segment` will display content.

## Technical Notes

- All elements use light DOM (not shadow DOM) for styling simplicity
- Parent `ef-captions` element updates child `textContent` directly
- Empty or punctuation-only content automatically hides elements via `hidden` attribute
- Elements maintain text flow by using `display: inline` with no margins/padding
- `--ef-word-seed` provides deterministic randomness based on word index (not random each frame)
