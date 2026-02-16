---
title: Caption Sub-Components
description: Style individual words and segments within Captions for karaoke-style effects
type: reference
nav:
  parent: "Components / Text & Graphics"
  priority: 33
  related: ["captions", "text-segment"]
api:
  properties:
    - name: className
      type: string
      description: CSS classes for styling (applies to all caption sub-components)
    - name: children
      type: React.ReactNode
      description: Nested caption components (for CaptionsSegment only)
---

# Caption Sub-Components

Style individual words and segments within Captions for karaoke-style effects.

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

## Components

### CaptionsSegment

Container for a full caption segment. Use this to wrap and style the current caption text.

### CaptionsActiveWord

Displays the currently spoken word. Updates automatically as playback progresses.

### CaptionsBeforeActiveWord

Displays all words in the current segment that come before the active word.

### CaptionsAfterActiveWord

Displays all words in the current segment that come after the active word.

## Basic Highlighting

```tsx
<Captions src="/assets/captions.json" className="absolute bottom-8 w-full text-center">
  <CaptionsSegment className="text-2xl">
    <CaptionsBeforeActiveWord className="text-gray-400" />
    <CaptionsActiveWord className="text-white font-bold" />
    <CaptionsAfterActiveWord className="text-gray-400" />
  </CaptionsSegment>
</Captions>
```

## Karaoke Style

```tsx
<Captions src="/assets/captions.json" className="absolute bottom-12 w-full text-center">
  <CaptionsSegment className="text-3xl font-bold px-4">
    <CaptionsBeforeActiveWord className="text-white" />
    <CaptionsActiveWord className="text-yellow-400 scale-110 inline-block" />
    <CaptionsAfterActiveWord className="text-gray-500" />
  </CaptionsSegment>
</Captions>
```

## Background Highlight

```tsx
<Captions src="/assets/captions.json" className="absolute bottom-8 w-full text-center">
  <CaptionsSegment className="text-2xl">
    <CaptionsBeforeActiveWord className="text-white" />
    <CaptionsActiveWord className="bg-blue-500 text-white px-2 py-1 rounded" />
    <CaptionsAfterActiveWord className="text-white" />
  </CaptionsSegment>
</Captions>
```

## Gradient Active Word

```tsx
<Captions src="/assets/captions.json" className="absolute bottom-10 w-full text-center">
  <CaptionsSegment className="text-4xl font-bold">
    <CaptionsBeforeActiveWord className="opacity-60" />
    <CaptionsActiveWord className="bg-gradient-to-r from-purple-500 to-pink-500 text-transparent bg-clip-text" />
    <CaptionsAfterActiveWord className="opacity-60" />
  </CaptionsSegment>
</Captions>
```

## Animated Transitions

```tsx
<Captions src="/assets/captions.json" className="absolute bottom-12 w-full text-center">
  <CaptionsSegment className="text-3xl">
    <CaptionsBeforeActiveWord className="text-white transition-opacity duration-300 opacity-50" />
    <CaptionsActiveWord className="text-yellow-400 font-bold transition-all duration-200 scale-125 inline-block drop-shadow-lg" />
    <CaptionsAfterActiveWord className="text-white transition-opacity duration-300 opacity-30" />
  </CaptionsSegment>
</Captions>
```

## With Video

```tsx
import { Timegroup, Video, Captions, CaptionsSegment, CaptionsActiveWord, CaptionsBeforeActiveWord, CaptionsAfterActiveWord } from "@editframe/react";

<Timegroup mode="contain" className="absolute w-full h-full">
  <Video src="/assets/interview.mp4" className="size-full object-cover" />

  <Captions src="/assets/interview-captions.json" className="absolute bottom-16 w-full text-center px-8">
    <CaptionsSegment className="text-3xl font-semibold bg-black/70 px-6 py-3 rounded-lg inline-block">
      <CaptionsBeforeActiveWord className="text-gray-300" />
      <CaptionsActiveWord className="text-white font-bold underline decoration-blue-500 decoration-4" />
      <CaptionsAfterActiveWord className="text-gray-400" />
    </CaptionsSegment>
  </Captions>
</Timegroup>
```

## Multiple Styling Approaches

```tsx
<Captions src="/assets/captions.json" className="absolute bottom-8 w-full text-center">
  <CaptionsSegment className="text-2xl font-bold">
    {/* Progressive opacity */}
    <CaptionsBeforeActiveWord className="text-white opacity-100" />
    <CaptionsActiveWord className="text-yellow-300 opacity-100 scale-110 inline-block" />
    <CaptionsAfterActiveWord className="text-white opacity-40" />
  </CaptionsSegment>
</Captions>
```

## Outlined Text

```tsx
<Captions src="/assets/captions.json" className="absolute bottom-12 w-full text-center">
  <CaptionsSegment
    className="text-4xl font-bold"
    style={{
      textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000'
    }}
  >
    <CaptionsBeforeActiveWord className="text-white" />
    <CaptionsActiveWord className="text-yellow-400" />
    <CaptionsAfterActiveWord className="text-white" />
  </CaptionsSegment>
</Captions>
```

## CSS Variables

Each `CaptionsActiveWord` has access to a CSS variable for advanced effects:

- `--ef-word-seed` - Deterministic random value (0-1) based on word index

```tsx
<Captions src="/assets/captions.json" className="absolute bottom-8 w-full text-center">
  <CaptionsSegment className="text-3xl">
    <CaptionsBeforeActiveWord className="text-gray-400" />
    <CaptionsActiveWord
      className="inline-block"
      style={{
        color: `hsl(calc(var(--ef-word-seed) * 60 + 180), 70%, 60%)`,
        transform: 'scale(1.2)'
      }}
    />
    <CaptionsAfterActiveWord className="text-gray-500" />
  </CaptionsSegment>
</Captions>
```

## Accessibility

```tsx
<Captions src="/assets/captions.json" className="absolute bottom-8 w-full text-center">
  <CaptionsSegment
    className="text-2xl bg-black/80 px-6 py-3 rounded"
    role="complementary"
    aria-live="polite"
  >
    <CaptionsBeforeActiveWord className="text-white" />
    <CaptionsActiveWord className="text-yellow-300 font-bold" />
    <CaptionsAfterActiveWord className="text-white" />
  </CaptionsSegment>
</Captions>
```

## Bounce Effect

```tsx
<Captions src="/assets/captions.json" className="absolute bottom-12 w-full text-center">
  <CaptionsSegment className="text-3xl font-bold">
    <CaptionsBeforeActiveWord className="text-white" />
    <CaptionsActiveWord className="text-pink-400 animate-bounce inline-block" />
    <CaptionsAfterActiveWord className="text-white opacity-50" />
  </CaptionsSegment>
</Captions>
```

## Shadow Effects

```tsx
<Captions src="/assets/captions.json" className="absolute bottom-8 w-full text-center">
  <CaptionsSegment className="text-3xl font-bold">
    <CaptionsBeforeActiveWord className="text-white drop-shadow" />
    <CaptionsActiveWord className="text-yellow-400 drop-shadow-[0_4px_8px_rgba(234,179,8,0.8)]" />
    <CaptionsAfterActiveWord className="text-white drop-shadow" />
  </CaptionsSegment>
</Captions>
```

## Progressive Reveal

```tsx
<Captions src="/assets/captions.json" className="absolute bottom-10 w-full text-center">
  <CaptionsSegment className="text-2xl">
    {/* Already spoken words are fully visible */}
    <CaptionsBeforeActiveWord className="text-green-400 font-semibold" />
    {/* Current word is highlighted */}
    <CaptionsActiveWord className="text-white font-bold bg-green-500 px-2 rounded" />
    {/* Future words are dimmed */}
    <CaptionsAfterActiveWord className="text-gray-600" />
  </CaptionsSegment>
</Captions>
```

## Notes

- All caption sub-components must be nested within a `Captions` component
- Text content is automatically populated from the captions JSON file
- Sub-components use light DOM, so styles apply directly without shadow DOM concerns
- Empty or punctuation-only words are automatically hidden
- Words are automatically space-separated for proper layout
- Use `inline-block` for transform animations on active words
- Caption sub-components update automatically as playback progresses
