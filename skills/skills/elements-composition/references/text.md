---
title: Text Element
description: Animated text with character, word, and line splitting
type: reference
nav:
  parent: "Elements / Text & Graphics"
  priority: 30
  related: ["captions"]
api:
  attributes:
    - name: split
      type: string
      default: "word"
      description: Split mode
      values: ["line", "word", "char"]
    - name: stagger
      type: timestring
      description: Delay between segments (e.g., "100ms")
    - name: easing
      type: string
      default: "linear"
      description: Easing function
    - name: duration
      type: timestring
      description: Total duration
---

# ef-text

Animated text with character/word/line splitting.

## Basic (No Animation)

```html live
<ef-timegroup mode="contain" class="w-[720px] h-[480px] bg-black flex items-center justify-center">
  <ef-text duration="5s" class="text-white text-2xl">Static text</ef-text>
</ef-timegroup>
```

## Word Animation

```html live
<ef-timegroup mode="contain" class="w-[720px] h-[480px] bg-black flex items-center justify-center">
  <ef-text split="word" stagger="100ms" duration="3s" class="text-white text-3xl">
    <template>
      <ef-text-segment class="fade-in"></ef-text-segment>
    </template>
    Timeline Layer Demo
  </ef-text>
</ef-timegroup>
```

## Character Animation

```html
<ef-text split="char" stagger="30ms" duration="2s" class="text-yellow-400 text-4xl">
  <template>
    <ef-text-segment class="slide-in"></ef-text-segment>
  </template>
  HEADLINES
</ef-text>
```

## CSS for Animations

```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slideIn {
  from { opacity: 0; transform: translateX(-20px); }
  to { opacity: 1; transform: translateX(0); }
}

.fade-in { animation: fadeIn 0.4s ease-out forwards; }
.slide-in { animation: slideIn 0.3s ease-out forwards; }
```

## Lower Third

```html live
<ef-timegroup mode="contain" class="w-[720px] h-[480px] bg-black relative">
  <ef-text duration="4s" class="absolute bottom-16 left-4 bg-blue-600/90 text-white px-4 py-2 rounded-md text-sm font-semibold">
    Scene Label
  </ef-text>
</ef-timegroup>
```
