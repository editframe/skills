---
title: Text Segment Element
description: Individual segment in split text with animation support
type: reference
nav:
  parent: "Elements / Text & Graphics"
  priority: 32
  related: ["text", "captions"]
api:
  attributes:
    - name: segmentIndex
      type: number
      description: Index of this segment in the text
    - name: segmentText
      type: string
      description: Text content of this segment
    - name: staggerOffsetMs
      type: number
      description: Calculated stagger delay for this segment
    - name: segmentStartMs
      type: number
      description: Start time of segment relative to parent
    - name: segmentEndMs
      type: number
      description: End time of segment relative to parent
    - name: hidden
      type: boolean
      default: false
      description: Whether segment is hidden
  methods:
    - name: registerAnimations()
      signature: "static registerAnimations(id: string, cssText: string): void"
      description: Register animation styles globally for all text segments
      returns: void
    - name: unregisterAnimations()
      signature: "static unregisterAnimations(id: string): void"
      description: Unregister previously registered animation styles
      returns: void
react:
  generate: true
  componentName: TextSegment
  importPath: "@editframe/react"
  additionalProps:
    - name: className
      type: string
      description: CSS classes for styling this segment
    - name: children
      type: React.ReactNode
      description: Text content for this segment
  nav:
    parent: "Components / Text & Graphics"
    priority: 32
    related: ["text", "captions"]
---

<!-- html-only -->
# ef-text-segment
<!-- /html-only -->
<!-- react-only -->
# TextSegment
<!-- /react-only -->

<!-- html-only -->
Individual segment created when splitting text by word, character, or line.
<!-- /html-only -->
<!-- react-only -->
Style and animate individual words or lines within Text components.
<!-- /react-only -->

<!-- react-only -->
## Import

```tsx
import { Text, TextSegment } from "@editframe/react";
```
<!-- /react-only -->

<!-- html-only -->
## Overview

`ef-text-segment` elements are automatically created by `ef-text` when using split modes. Each segment represents a word, character, or line and can be styled and animated independently.

Segments have three CSS variables available for animations:
- `--ef-index` - Segment index (0, 1, 2, ...)
- `--ef-stagger-offset` - Calculated stagger delay (e.g., "0ms", "100ms", "200ms")
- `--ef-seed` - Deterministic random value (0-1) based on segment index
<!-- /html-only -->

## Basic Segment Styling

<!-- html-only -->
```html live
<ef-timegroup mode="contain" class="w-[720px] h-[480px] bg-black flex items-center justify-center">
  <ef-text split="word" stagger="80ms" duration="4s" class="text-white text-3xl">
    <template>
      <ef-text-segment class="segment-fade"></ef-text-segment>
    </template>
    Every word fades in separately
  </ef-text>

  <style>
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .segment-fade {
      animation: fadeIn 0.6s ease-out forwards;
      animation-delay: var(--ef-stagger-offset);
    }
  </style>
</ef-timegroup>
```
<!-- /html-only -->
<!-- react-only -->
```tsx
<Text duration="3s" className="text-4xl">
  <TextSegment className="text-red-500">Red</TextSegment>
  {" "}
  <TextSegment className="text-blue-500">Blue</TextSegment>
  {" "}
  <TextSegment className="text-green-500">Green</TextSegment>
</Text>
```
<!-- /react-only -->

<!-- react-only -->
## CSS Variables

Each TextSegment has access to CSS variables for advanced animations:

- `--ef-seed` - Deterministic random value (0-1) based on segment index
- `--ef-stagger-offset` - Stagger delay in milliseconds
- `--ef-index` - Segment index (0, 1, 2, ...)
<!-- /react-only -->

<!-- html-only -->
## Using registerAnimations()

Register animation styles globally rather than using inline `<style>` tags. This is the recommended approach for reusable animations.

```html live
<ef-timegroup mode="contain" class="w-[720px] h-[480px] bg-black flex items-center justify-center">
  <ef-text split="word" stagger="60ms" duration="3s" class="text-yellow-400 text-4xl font-bold">
    <template>
      <ef-text-segment class="bounce-in"></ef-text-segment>
    </template>
    BOUNCE EFFECT
  </ef-text>

  <script>
    // Register animation once globally
    customElements.whenDefined('ef-text-segment').then(() => {
      const EFTextSegment = customElements.get('ef-text-segment');
      EFTextSegment.registerAnimations('bounce', `
        @keyframes bounceIn {
          0% { transform: scale(0) rotate(-180deg); opacity: 0; }
          50% { transform: scale(1.2) rotate(0deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }

        .bounce-in {
          animation: bounceIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
          animation-delay: var(--ef-stagger-offset);
        }
      `);
    });
  </script>
</ef-timegroup>
```

## Character-by-Character Animation

```html live
<ef-timegroup mode="contain" class="w-[720px] h-[480px] bg-black flex items-center justify-center">
  <ef-text split="char" stagger="30ms" duration="2.5s" class="text-cyan-400 text-5xl font-mono">
    <template>
      <ef-text-segment class="char-reveal"></ef-text-segment>
    </template>
    GLITCH
  </ef-text>

  <style>
    @keyframes charReveal {
      0% {
        opacity: 0;
        transform: translateX(calc(var(--ef-seed) * 40px - 20px));
        filter: blur(8px);
      }
      100% {
        opacity: 1;
        transform: translateX(0);
        filter: blur(0);
      }
    }

    .char-reveal {
      animation: charReveal 0.4s ease-out forwards;
      animation-delay: var(--ef-stagger-offset);
    }
  </style>
</ef-timegroup>
```

## Using --ef-seed for Randomness

The `--ef-seed` variable provides deterministic randomness (0-1) for each segment.

```html live
<ef-timegroup mode="contain" class="w-[720px] h-[480px] bg-black flex items-center justify-center">
  <ef-text split="word" stagger="100ms" duration="4s" class="text-white text-3xl">
    <template>
      <ef-text-segment class="random-pop"></ef-text-segment>
    </template>
    Random pop-in from different angles
  </ef-text>

  <style>
    @keyframes randomPop {
      from {
        opacity: 0;
        /* Use --ef-seed to vary rotation per word */
        transform:
          translateY(calc(var(--ef-seed) * 40px - 20px))
          rotate(calc(var(--ef-seed) * 360deg - 180deg))
          scale(0.3);
      }
      to {
        opacity: 1;
        transform: translateY(0) rotate(0) scale(1);
      }
    }

    .random-pop {
      animation: randomPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
      animation-delay: var(--ef-stagger-offset);
    }
  </style>
</ef-timegroup>
```

## Multiple Segments Per Word/Char

Create multiple segments for each text unit by using multiple `ef-text-segment` elements in the template.

```html live
<ef-timegroup mode="contain" class="w-[720px] h-[480px] bg-black flex items-center justify-center">
  <ef-text split="word" stagger="120ms" duration="4s" class="text-white text-3xl">
    <template>
      <!-- Shadow segment behind -->
      <ef-text-segment class="segment-shadow"></ef-text-segment>
      <!-- Main segment on top -->
      <ef-text-segment class="segment-main"></ef-text-segment>
    </template>
    Layered shadow effect
  </ef-text>

  <style>
    .segment-shadow {
      position: absolute;
      color: #3b82f6;
      filter: blur(4px);
      animation: shadowSlide 0.6s ease-out forwards;
      animation-delay: var(--ef-stagger-offset);
    }

    .segment-main {
      position: relative;
      animation: mainSlide 0.6s ease-out forwards;
      animation-delay: var(--ef-stagger-offset);
    }

    @keyframes shadowSlide {
      from { opacity: 0; transform: translate(-20px, 10px); }
      to { opacity: 0.6; transform: translate(4px, 4px); }
    }

    @keyframes mainSlide {
      from { opacity: 0; transform: translate(-20px, 0); }
      to { opacity: 1; transform: translate(0, 0); }
    }
  </style>
</ef-timegroup>
```

## Unregistering Animations

Remove previously registered animations when no longer needed.

```javascript
// Unregister animation styles
const EFTextSegment = customElements.get('ef-text-segment');
EFTextSegment.unregisterAnimations('bounce');
```

This removes the animation stylesheet from all existing `ef-text-segment` elements.
<!-- /html-only -->

<!-- react-only -->
## Animated Segments

### Fade In Stagger

```tsx
<Text duration="5s" className="text-white text-4xl">
  <TextSegment
    className="inline-block animate-fade-in"
    style={{ animationDelay: 'calc(var(--ef-index) * 100ms)' }}
  >
    Word
  </TextSegment>
  {" "}
  <TextSegment
    className="inline-block animate-fade-in"
    style={{ animationDelay: 'calc(var(--ef-index) * 100ms)' }}
  >
    by
  </TextSegment>
  {" "}
  <TextSegment
    className="inline-block animate-fade-in"
    style={{ animationDelay: 'calc(var(--ef-index) * 100ms)' }}
  >
    word
  </TextSegment>
</Text>
```

### Scale Animation

```tsx
<Text duration="4s" className="text-white text-5xl flex gap-2">
  <TextSegment className="inline-block animate-bounce">
    Bounce
  </TextSegment>
  <TextSegment className="inline-block animate-bounce animation-delay-100">
    Each
  </TextSegment>
  <TextSegment className="inline-block animate-bounce animation-delay-200">
    Word
  </TextSegment>
</Text>
```

## Register Custom Animations

Use `TextSegment.registerAnimations()` to define animations shared across all segments:

```tsx
import { TextSegment } from "@editframe/react";

// Register once at app initialization
TextSegment.registerAnimations("customAnimations", `
  @keyframes slideIn {
    from {
      transform: translateX(-100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  .slide-in {
    animation: slideIn 0.5s ease-out;
  }

  @keyframes bounceIn {
    0% { transform: scale(0); }
    50% { transform: scale(1.2); }
    100% { transform: scale(1); }
  }

  .bounce-in {
    animation: bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  }
`);

// Use in components
const AnimatedText = () => (
  <Text duration="5s" className="text-white text-4xl">
    <TextSegment className="slide-in inline-block">Slides</TextSegment>
    {" "}
    <TextSegment className="bounce-in inline-block">Bounces</TextSegment>
  </Text>
);
```

## Random Variations

Use `--ef-seed` for randomized effects:

```tsx
<Text duration="5s" className="text-white text-4xl">
  <TextSegment
    className="inline-block"
    style={{
      transform: 'rotate(calc(var(--ef-seed) * 20deg - 10deg))',
      color: `hsl(calc(var(--ef-seed) * 360), 70%, 60%)`
    }}
  >
    Random
  </TextSegment>
  {" "}
  <TextSegment
    className="inline-block"
    style={{
      transform: 'rotate(calc(var(--ef-seed) * 20deg - 10deg))',
      color: `hsl(calc(var(--ef-seed) * 360), 70%, 60%)`
    }}
  >
    Colors
  </TextSegment>
</Text>
```

## Line-by-Line Animation

```tsx
<Text duration="6s" className="text-white text-3xl">
  <TextSegment
    className="block opacity-0 animate-fade-in"
    style={{ animationDelay: '0ms' }}
  >
    First line appears
  </TextSegment>
  <TextSegment
    className="block opacity-0 animate-fade-in"
    style={{ animationDelay: '1000ms' }}
  >
    Second line follows
  </TextSegment>
  <TextSegment
    className="block opacity-0 animate-fade-in"
    style={{ animationDelay: '2000ms' }}
  >
    Third line completes
  </TextSegment>
</Text>
```

## Gradient Text Per Word

```tsx
<Text duration="5s" className="text-6xl font-bold flex gap-3">
  <TextSegment className="bg-gradient-to-r from-purple-500 to-pink-500 text-transparent bg-clip-text">
    Gradient
  </TextSegment>
  <TextSegment className="bg-gradient-to-r from-blue-500 to-cyan-500 text-transparent bg-clip-text">
    Text
  </TextSegment>
  <TextSegment className="bg-gradient-to-r from-green-500 to-emerald-500 text-transparent bg-clip-text">
    Effects
  </TextSegment>
</Text>
```

## With useTimingInfo

Combine with timing information for synchronized animations:

```tsx
import { Text, TextSegment, useTimingInfo } from "@editframe/react";

const TimedSegments = () => {
  const { ref, ownCurrentTimeMs } = useTimingInfo();

  return (
    <Text ref={ref} duration="6s" className="text-white text-4xl">
      <TextSegment
        className="inline-block"
        style={{
          opacity: ownCurrentTimeMs > 1000 ? 1 : 0,
          transform: `scale(${ownCurrentTimeMs > 1000 ? 1 : 0})`
        }}
      >
        First
      </TextSegment>
      {" "}
      <TextSegment
        className="inline-block"
        style={{
          opacity: ownCurrentTimeMs > 2000 ? 1 : 0,
          transform: `scale(${ownCurrentTimeMs > 2000 ? 1 : 0})`
        }}
      >
        Second
      </TextSegment>
      {" "}
      <TextSegment
        className="inline-block"
        style={{
          opacity: ownCurrentTimeMs > 3000 ? 1 : 0,
          transform: `scale(${ownCurrentTimeMs > 3000 ? 1 : 0})`
        }}
      >
        Third
      </TextSegment>
    </Text>
  );
};
```

## Cleanup

Unregister animations when no longer needed:

```tsx
import { useEffect } from "react";
import { TextSegment } from "@editframe/react";

const MyComponent = () => {
  useEffect(() => {
    TextSegment.registerAnimations("myAnimations", `
      /* animation styles */
    `);

    return () => {
      TextSegment.unregisterAnimations("myAnimations");
    };
  }, []);

  return (/* ... */);
};
```
<!-- /react-only -->

## CSS Variables Reference

| Variable | Type | Description |
|----------|------|-------------|
| `--ef-index` | number | Segment index (0, 1, 2, ...) |
| `--ef-stagger-offset` | time | Calculated stagger delay (e.g., "0ms", "100ms") |
| `--ef-seed` | number | Deterministic random (0-1) based on index |

## Technical Notes

<!-- html-only -->
- Segments are automatically created by `ef-text` when using split modes
- Segments inherit animation properties from parent `ef-text` element
- `registerAnimations()` uses adopted stylesheets for efficient global sharing
- Non-whitespace segments automatically become `inline-block` when animated to enable transforms
- Whitespace segments remain `inline` to preserve text flow
<!-- /html-only -->
<!-- react-only -->
- TextSegment requires a parent `Text` component
- Use `inline-block` display for transform animations to work correctly
- Animation styles are shared globally across all TextSegment instances
- Each segment's `--ef-seed` value is deterministic based on its index
- For character-level animations, use the underlying `ef-text` element's `split="char"` attribute instead
<!-- /react-only -->
